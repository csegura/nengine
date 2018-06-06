//******************************************
//
//CONTROLLERS
//
//******************************************

  const server = require("./../server.js");
  const jwt = require("jsonwebtoken");
  const crypto = require("crypto");
  const config = server.config;
  const errorCodes = server.errorCodes;
  const storedProcedures = server.storedProcedures;
  const controllers = {};

  //******************************************
  //MSSQL DATABASE INTEGRATION
  //******************************************

  const Request = require('tedious').Request;
  const TYPES = require('tedious').TYPES;
  const ConnectionPool = require('tedious-connection-pool');
  
  const poolConfig = {
      min: 2,
      max: 50,
      log: false
  };

  const connectionConfig = {
      userName: config.DATABASE_USERNAME,
      password: config.DATABASE_PASSWORD,
      server: config.DATABASE_SERVER,
      rowCollectionOnDone: true,
      rowCollectionOnRequestCompletion: true
  };

  const pool = new ConnectionPool(poolConfig, connectionConfig);

  pool.on('error', (err) => {
    if(err) {
      console.log(err)
    }
  });


  controllers.callProcedureRows = (procedure, parameters) => {    
    return new Promise(
      (resolve, reject) => {       
        pool.acquire((err, connection) => {
            if (err) {
                reject(err);
            }
            const request = new Request(procedure, (err) => {
                if (err) {
                    reject(err);
                }
                connection.release();
            });
            parameters.forEach((item) => {
              request.addParameter(item.name, item.type, item.value);
            })
            var result = [];
            request.on("row", (columns) => {              
              var item = {}; 
              columns.forEach(function (column) {                   
                  item[column.metadata.colName] = column.value; 
              });    
              result.push(item);
              resolve(result);              
            });
            request.on("doneProc", (rowCount, more, rows) => {
              resolve([]);
             });
            connection.execSql(request);
        });
      }
    );
  };

  controllers.callProcedure = (procedure, parameters) => {
    return new Promise(
      (resolve, reject) => {
        pool.acquire((err, connection) => {
            if (err) {
                reject(err);
            }
            const request = new Request(procedure, (err) => {
                if (err) {
                    reject(err);
                }
                connection.release();
            });
            parameters.forEach((item) => {
              request.addParameter(item.name, item.type, item.value);
            })            
            request.on('doneInProc', function (rowCount, more, rows) { 
              console.log("Done.",rowCount + " rows returned."); 
              console.log("Done.",rows); 
              console.log("Done.",more); 
              resolve(rowCount);
            });
            // request.on("row", (columns) => {
            //   if (columns) {
            //     console.log("row:",columns); 
            //     const data = columns.map((column) => {
            //       return column.value;
            //     });
            //     resolve(JSON.parse(data));
            //   }
            //   resolve();
            // });
            // request.on('row', (columns) => {
            //      console.log("*",columns);
            //      var data = [];
            //      columns.map((column) => {
            //        data.push(column.metadata.colName, column.value);
            //      });
            //      console.log(data);
            //      resolve(JSON.parse(data));
            // });
            //console.log(request);
            connection.execSql(request);
        });
      }
    );
  };

  //******************************************
  //ENCRYPT PASSWORDS
  //******************************************

  controllers.encrypt = (password) => {
    if(password) {
      const cipher = crypto.createCipher(config.CRYPTO_ALGORITHM,config.CRYPTO_PASSWORD);
      cipher.update(password,'utf8','hex');
      const crypted = cipher.final('hex');
      console.log("+",crypted);
      return crypted;
    }
  };

  //******************************************
  //REGISTER
  //******************************************

  controllers.register = (req, res) => {
    const parameters = [
      {
        "name": "email",
        "type": TYPES.VarChar,
        "value": req.headers["email"]
      }
    ];
    controllers.callProcedure(storedProcedures.CHECK_EMAIL, parameters)
      .then((Pass) => {
        if(Pass === 1) {
          const user = [
            {
              "name": "email",
              "type": TYPES.VarChar,
              "value": req.headers["email"]
            },
            {
              "name": "password",
              "type": TYPES.VarChar,
              "value": controllers.encrypt(req.headers["password"])
            },
          ];
          controllers.callProcedure(storedProcedures.SAVE_USER, user)
        } else {
          res.json({
            success: false
          });
        }
      })
      .then(() => {
        res.json({
          success: true
        });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  //******************************************
  //LOGIN
  //******************************************

  controllers.login = (req, res) => {
    if (!req.headers["password"] || !req.headers["email"]) {
      res.status(500).send('error');
    }
    const password = controllers.encrypt(req.headers["password"]);
    const user = [
      {
        "name": "email",
        "type": TYPES.NVarChar,
        "value": req.headers["email"]
      },
      {
        "name": "password",
        "type": TYPES.NVarChar,
        "value": password
      }
    ];
    controllers.callProcedure(storedProcedures.CHECK_PASSWORD, user)
      .then((Correct) => {
        if(Correct === 1) {
          const token = jwt.sign({
            username: req.headers["email"],
            password: password
          }, server.config.KEY, {
            expiresIn: server.config.EXPIRES
          });
          res.json({
            success: true,
            token: token
          });
        } else {
          res.json({
            success: false
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  //******************************************
  //VALIDATE SECURE REQUESTS - MIDDLEWARE
  //******************************************

  server.secureRoutes.use((req, res, next) => {
    //Two option to pass the token (body OR header)
    const token = req.body.token || req.headers["token"];
    console.log(token);
    if(token) {
      jwt.verify(token, config.KEY, (err, decode) => {
        if(err) {          
          res.status(403).send(errorCodes.INVALID_TOKEN);
        } else {
          console.log(decode);
          next();
        }
      });
    } else {
      res.status(401).send(errorCodes.NO_TOKEN);
    }
  });

  //******************************************
  //UNSECURE GET REQUESTS
  //******************************************

  //******************************************
  //UNSECURE POST REQUESTS
  //******************************************

  //******************************************
  //SECURE GET REQUESTS (secureRoutes)
  //******************************************
controllers.getSecureTest = (req, res) => {
  controllers.callProcedureRows(storedProcedures.LIST_USERS,[])
    .then((Correct) => {
      res.json(Correct);
    })
    .catch((err) => {
      console.log(err);
    });
};
  //******************************************
  //SECURE POST REQUESTS (secureRoutes)
  //******************************************


//Export Controllers
module.exports = controllers;

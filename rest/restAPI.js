//******************************************
//
//RESTFUL API/ENDPOINTS
//
//******************************************

  const server = require("./../server.js");
  const controllers = require("./../controllers/controllers.js");

  //******************************************
  //REGISTER REQUEST
  //******************************************
  server.post("/register", controllers.register);

  //******************************************
  //LOGIN REQUEST
  //******************************************
  server.post("/login", controllers.login);

  //******************************************
  //UNSECURE GET REQUESTS
  //******************************************

  //******************************************
  //UNSECURE POST REQUESTS
  //******************************************

  //******************************************
  //SECURE GET REQUESTS (TOKEN NEEDED)
  //******************************************
  //server.secureRoutes.get("/getSecureDummyData", controllers.getSecureDummyData);
  server.secureRoutes.get("/getSecureTest", controllers.getSecureTest);

  //******************************************
  //SECURE POST REQUESTS (TOKEN NEEDED)
  //******************************************
  //server.secureRoutes.post("/postSecureDummyData", controllers.postSecureDummyData);

//Export Endpoints
module.exports = server;

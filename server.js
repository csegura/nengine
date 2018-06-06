//******************************************
//
//Author: Henry John Nieuwenhuizen - www.HenryJohnNieuwenhuizen.com
//
//******************************************

  const express = require("express");
  const bodyParser = require("body-parser");
  const server = express();
  const fs = require('fs');

  //Set App Properties
  server.use(bodyParser.urlencoded({extended:true}));
  server.use(bodyParser.json());

  //Set Secure Routes
  server.secureRoutes = express.Router();
  server.use("/secure", server.secureRoutes);

  //Get Config File
  server.config = JSON.parse(fs.readFileSync("./config.json"));

  //Get Error Codes
  server.errorCodes = JSON.parse(fs.readFileSync("./errorCodes.json"));

  //Get Stored Procedures
  server.storedProcedures = JSON.parse(fs.readFileSync("./storedProcedures.json"));

  //Start Server
  server.listen(server.config.PORT, () => {
    console.log("server is running on port: " + server.config.PORT);
  })

  //Export Server App (Modules Use)
  module.exports = server;

  //Import Endpoints
  const rest = require("./rest/restAPI.js");

'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const https = require("https");
const options = {
  hostname: "api.edmunds.com",
  path: "/api/vehicle/v2/ford/fiesta/2011?view=full&fmt=json&api_key=2ahtvhmghbdx75qm6qjeea38"
};
const apiKey = "c666snh3xxe9yp2fgf7zxysj";

exports.handler = (event, context, callback) => {
var docClient = new AWS.DynamoDB.DocumentClient();

var table = "AskJakeCarMaintenance";

var make = "Ford";
var model = "Fiesta";
var year = 2011;

console.log("starting request");

https.request(options, (res) => {
  console.log(res.statusCode);
  res.on('data', (d) => {
    var data = JSON.parse(d);
    var params = {
      TableName:table,
      Item:{
         "modelYearId": data.id
      }
    };

  console.log("Adding a new item...");
  docClient.put(params, function(err, data) {
     if (err) {
         console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
     } else {
         console.log("Added item:", JSON.stringify(data, null, 2));
     }
  });
 })
}).end();

callback(null, 'Successful');  // Echo back the first key value
//callback('Something went wrong');
};

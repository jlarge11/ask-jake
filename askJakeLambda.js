/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
* This sample demonstrates a simple skill built with the Amazon Alexa Skills
* nodejs skill development kit.
* This sample supports multiple lauguages. (en-US, en-GB, de-DE).
* The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
* as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
**/

'use strict';

const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const https = require("https");

const apiKey = "68da4xqgp74rvhph299vsebk";

const handlers = {
  'YearMakeModel': function() {
    console.log('howdy ho!');
    let slots = this.event.request.intent.slots;
    let year = slots.year.value;
    let make = slots.make.value;
    let model = slots.model.value;

    storeCar(year, make, model, this);
    this.emit(':tell', 'congrats, noted' );
  },
  'GetRecalls': function() {
    getRecalls(this);

  },
  'GetAgent': function() {
    this.emit(':tell', "you can contact Rick West.  I'll text you the number" );
    // TODO:  Text the phone number
  },
  'AMAZON.HelpIntent': function() {
    const speechOutput = this.t('HELP_MESSAGE');
    const reprompt = this.t('HELP_MESSAGE');
    this.emit(':ask', speechOutput, reprompt);
  },
  'AMAZON.CancelIntent': function() {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
  'AMAZON.StopIntent': function() {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  }
};

function getRecalls(alexaContext) {
  console.log('Were in getRecalls');
  var docClient = new AWS.DynamoDB.DocumentClient();

  var table = "AskJakeCarMaintenance";

  var params = {
    TableName: table
  };

  console.log("Scanning table.");
  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      // print id
      // console.log("Scan succeeded." + JSON.stringify(data.Items[0].modelYearId));
      // let url = `https://api.edmunds.com/v1/api/maintenance/recallrepository/findbymodelyearid?modelyearid=${data.Items[0].modelYearId}&fmt=json&api_key=68da4xqgp74rvhph299vsebk`;

      let url = `https://api.edmunds.com/v1/api/maintenance/recallrepository/findbymodelyearid?modelyearid=100523475&fmt=json&api_key=68da4xqgp74rvhph299vsebk`;
      https.request(url, (res) => {
        console.log('finished get.  status = ' + res.status);
        res.on('data', (d) => {
          var data = JSON.parse(d);
          console.log(''+ data.recallHolder.length);
          // TODO:  Send a text
          alexaContext.emit(':tell', `you have ${data.recallHolder.length} recalls.  Sending a text with more information`);
        });
      }).end();
    }
  }
}

function storeCar(year, make, model) {
  var docClient = new AWS.DynamoDB.DocumentClient();

  var table = "AskJakeCarMaintenance";

  let options = {
    hostname: "api.edmunds.com",
    path: `/api/vehicle/v2/${make}/${model}/${year}?view=full&fmt=json&api_key=${apiKey}`
  };

  console.log('make: '+make+ ' model: '+model+' year: '+year);

  console.log("starting request to " + options.path);

  https.request(options, (res) => {
    console.log('finished get.  status = ' + res.statusCode);
    res.on('error', (e) => {
      console.log(JSON.stringify(e));
    });

    res.on('data', (d) => {
      console.log('data from edmunds:  ' + d);
      var data = JSON.parse(d);
      //used to create the table
      var params = {
        TableName: table,
        Item: {
          "modelYearId": data.id
        }
      };

      console.log("Putting the following to the database:  " + JSON.stringify(params));

      docClient.put(params, function(err, data) {
        if (err) {
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
        }
      });
    });
  }).end();
}

exports.handler = function(event, context) {
  const alexa = Alexa.handler(event, context);
  alexa.APP_ID = undefined;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

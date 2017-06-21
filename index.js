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
const Axios = require('axios');
const AWS = require('aws-sdk');
const https = require("https");

const apiKey = "68da4xqgp74rvhph299vsebk";

const handlers = {
  'Khakis': function() {
    this.emit(':tell', `<prosody rate="50%" pitch="low">auh...</prosody><prosody rate="slow" pitch="low"> Khakis?.</prosody>`);
  },
  'YearMakeModel': function() {
    console.log('howdy ho!');
    let slots = this.event.request.intent.slots;
    let year = slots.year.value;
    let make = slots.make.value;
    let model = slots.model.value;

    let table = "AskJakeDB";
    getCar(year, make, model).then((response) => {
      console.log(response.data.id);

      var params = {
        TableName: table,
        Item: {
          "modelYearId": response.data.id
        }
      };

      console.log(params);
      console.log("Adding a new item...");
      createNewVehicle(params).then(() => {
        this.emit(':tell', `Congratulations!  Don't forget to contact your State Farm agent.`);
        console.log('Finished');
      });
    });
  },
  'GetRecalls': function() {
    getRecalls().then((resolved) => {
      let cardTitle = "Your Vehicle's Recalls";
      let speechOutput = `There are ${resolved.data.recallHolder.length} recalls on your vehicle.  I'll send you more information`;
      let cardContent = '';

      resolved.data.recallHolder.forEach((recallItem) => {
        cardContent += recallItem.recallNumber + '\r\n';
      });

      cardContent += '\r\nYou can contact your nearest Ford Service Center at 309-555-9876';
      this.emit(':tellWithCard', speechOutput, cardTitle, cardContent);
    });
  },
  'GetAgent': function() {
    let agentName = 'Mary Contreras';

    var speechOutput = `Looks like you can contact ${agentName}.  I'll send you the number`;
    var repromptSpeech = 'Reprompting';
    var cardTitle = 'Agent Contact';
    var cardContent = `${agentName}'s phone number is 309-555-1234`;

    var imageObj = {
      smallImageUrl: 'https://plus.google.com/u/0/photos/albums/p5rpljfv8u3qi5es540h86h5165sdo63a?pid=6431743030394494834&oid=101894744486224382452',
      largeImageUrl: 'https://imgs.xkcd.com/comics/standards.png'
    };

    var permissionArray = ['read::alexa:device:all:address'];

    this.emit(':tellWithCard', speechOutput, cardTitle, cardContent, imageObj);
    // this.emit(':tell', "you can contact Rick West at 309-555-1234");
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

function createNewVehicle(params) {
  let docClient = new AWS.DynamoDB.DocumentClient();
  return docClient.put(params).promise();
}

function getRecalls() {
  console.log('Were in getRecalls');
  let docClient = new AWS.DynamoDB.DocumentClient();

  let table = "AskJakeDB";

  let params = {
    TableName: table
  };

  console.log("Scanning table.");

  return docClient.scan(params).promise().then((data, err) => {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      return new Promise().reject('Scan failed.');
    } else {
      // print id
      console.log("Scan succeeded." + JSON.stringify(data.Items[0].modelYearId));
      return Axios({
        method: 'get',
        url: `https://api.edmunds.com/v1/api/maintenance/recallrepository/findbymodelyearid?modelyearid=${data.Items[0].modelYearId}&fmt=json&api_key=${apiKey}`
      });
    }
  });
}

function getCar(year, make, model) {

  console.log("starting request");
  let options = {
    hostname: "https://api.edmunds.com",
    path: `/api/vehicle/v2/${make}/${model}/${year}?view=full&fmt=json&api_key=${apiKey}`
  };
  console.log(options.path);
  return Axios({
    method: 'get',
    url: options.hostname + options.path
  });
}

exports.handler = function(event, context) {
  const alexa = Alexa.handler(event, context);
  alexa.APP_ID = undefined;
  alexa.registerHandlers(handlers);
  alexa.execute();
};

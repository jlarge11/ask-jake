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
const AlexaDeviceAddressClient = require('./AlexaDeviceAddressClient');

const apiKey = "nn54mh9tyr57vmfn5mb8g3er";
const TABLE = "AskJakeDB";

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

    let speech = 'Congratulations!';

    getVehicleFromDB().then((dbResponse) => {
      if(dbResponse.Items.length >= 1) {
          speech += ' Your new vehicle will now be referenced when asking about vehicle information.'
          dbResponse.Items.forEach((vehicle) => {
            deleteVehicleFromDB(vehicle);
          });
      }

      getVehicleFromAPI(year, make, model).then((response) => {
        console.log(response.data.id);

        var params = {
          TableName: TABLE,
          Item: {
            "modelYearId": response.data.id,
            "info": {
                "year": year,
                "make": make,
                "model": model
            }
          }
        };

        console.log(params);
        console.log("Adding a new item...");
        speech += ` Don't forget to contact your State Farm agent.`;
        createNewVehicle(params).then(() => {
          this.emit(':tell', speech);
          console.log('Finished');
        });
      });
    });
  },

  'GetRecalls': function() {
    getRecalls().then((response) => {
      let cardTitle = "Your Vehicle's Recalls";
      let speechOutput = `There are ${response.data.recallHolder.length} recalls on your vehicle.  I'll send you more information`;
      let cardContent = '';

      response.data.recallHolder.forEach((recallItem) => {
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
  },

  'FindNearestDealership': function() {
    getDeviceAddress(this).then((addressResponse) => {
      const postalCode = addressResponse.address.postalCode;
      getVehicleFromDB().then((dbResponse) => {
        const make = dbResponse.Items[0].info.make;
        findClosestDealerships(postalCode, make).then((response) => {
          const dealer = response.data.dealers[0];
          const speechOutput = `Your zipcode was ${postalCode}. Your closest ${make} dealership is ${dealer.name} on ${dealer.address.street} in ${dealer.address.city}`;
          const cardContent = `${dealer.name}\r\n${dealer.address.street}\r\n${dealer.address.city},${dealer.address.stateName}\r\n${dealer.address.zipcode}`;
          this.emit(':tellWithCard', speechOutput, 'Closest Dealership', cardContent);
        });
      });
    });
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
  },

  'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t get that. Asking about vehicle information.', 'Try asking about vehicle information.');
  }
};

function findClosestDealerships(postalCode, vehicleMake) {
  return Axios({
    method: 'get',
    url: `http://api.edmunds.com/api/dealer/v2/dealers/?zipcode=${postalCode}&make=${vehicleMake}&pageNum=1&pageSize=1&sortby=distance%3AASC&view=basic&api_key=${apiKey}`
  });
}

function checkAddress(alexa, addressResponse) {
  switch(addressResponse.statusCode) {
    case 200:
        console.log("Address successfully retrieved, now responding to user.");
        const address = addressResponse.address;

        const ADDRESS_MESSAGE =
            `${address['addressLine1']}, ${address['stateOrRegion']}, ${address['postalCode']}`;

        alexa.emit(":tell", ADDRESS_MESSAGE);
        break;
    case 204:
        // This likely means that the user didn't have their address set via the companion app.
        console.log("Successfully requested from the device address API, but no address was returned.");
        alexa.emit(":tell", 'No address');
        break;
    case 403:
        console.log("The consent token we had wasn't authorized to access the user's address.");
        alexa.emit(":tell", 'No permission');
        break;
    default:
        alexa.emit(":tell", 'I broke');
  }
}

function createNewVehicle(params) {
  let docClient = new AWS.DynamoDB.DocumentClient();
  return docClient.put(params).promise();
}

function getDeviceAddress(alexa) {
  const consentToken = alexa.event.context.System.user.permissions.consentToken;
  const deviceId = alexa.event.context.System.device.deviceId;
  const apiEndpoint = alexa.event.context.System.apiEndpoint
  const alexaDeviceAddressClient = new AlexaDeviceAddressClient(apiEndpoint, deviceId, consentToken);

  return alexaDeviceAddressClient.getCountryAndPostalCode();
}

function getRecalls() {
  console.log('Were in getRecalls');

  let params = {
    TableName: TABLE
  };

  console.log("Scanning table.");
  let docClient = new AWS.DynamoDB.DocumentClient();
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

function getVehicleFromDB() {
  let params = {
    TableName: TABLE
  };

  console.log("Scanning table.");
  let docClient = new AWS.DynamoDB.DocumentClient();
  return docClient.scan(params).promise();
}

function deleteVehicleFromDB(vehicle) {
  console.log(vehicle);
  let params = {
    TableName: TABLE,
    Key: {
      "modelYearId" : vehicle.modelYearId
    }
  }
  let docClient = new AWS.DynamoDB.DocumentClient();
  return docClient.delete(params).promise();
}

function getVehicleFromAPI(year, make, model) {

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

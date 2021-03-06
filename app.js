/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var request = require('request');
var Twitter = require('twitter');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var parser = require('json-parser');

var Client = require("ibmiotf");
var config = {
    "org": "82nnqq",
    "id": "MyTweets",
    "domain": "internetofthings.ibmcloud.com",
    "type": "Tweets",
    "auth-method": "token",
    "auth-token": "yqkd7382hdkd-"
};
var deviceClient = new Client.IotfDevice(config);
deviceClient.connect();

var twitterClient = new Twitter({
        consumer_key: 'uyGpIwSq2QmEjok8qsvAtwCW0',
        consumer_secret: 'P1Jona5WwUE54WF8LjQHE8ZJa2zK7wKmLGTj8WPZyGHqeMhxHl',
        access_token_key: '132337921-mWzwmPzlpWS9m5B7pw7T3VIWIgkPQQYUVkuGJqTG',
        access_token_secret: 'waoDLEZrg14hV2dox0FwTUs4Qv5C3ReajWOtVnlLVigUM'
    });

// create a new express server
var app = express();

var timesGetWeatherAndTweetsCalled = 0;
var weatherIntervalID;

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// When the device connects
deviceClient.on("connect", function() {
	console.log("Device connected!");
});

// When the device receives an error
deviceClient.on("error", function(err) {
	console.log("Error! - " + err);
});

app.get('/process_get', function(req, res)
{
	timesGetWeatherAndTweetsCalled = 0;
	// Prepare output in JSON format
	response = {
		lat1: req.query.latitude1,
		long1: req.query.longitude1,
		lat2: req.query.latitude2,
		long2: req.query.longitude2
	};
	var locationString = "";
	locationString += response.lat1 + "," + response.long1 + "," + response.lat2 + "," + response.long2;
	
	intervalID = setInterval(function() {
		getWeatherAndTweets(locationString);
	}, 10000);

	// res.setHeader("Content-Type", "text/html");
	// res.end("<form action='https://jpeterkdemoapp.mybluemix.net/process_get' method='GET'>" + 
 //      		"Latitude: <input type='text' name='latitude' /><br />" + 
 //      		"Longitude: <input type='text' name='longitude' /><br />" +
 //      		"<input type='submit' text='submit' />" +
 //    		"</form>" +
 //    		"<p id='blankSpace'>" + JSON.stringify(body.forecasts) + "</p>");
});

function getWeatherAndTweets(locationString)
{
	if (timesGetWeatherAndTweetsCalled >= 5)
	{
		clearInterval(intervalID);
		deviceClient.disconnect();
	}
	else
	{
		var callURL = "https://58a809af-857f-4b07-a8c3-2474229efe45:EwTcQmn8ST@twcservice.mybluemix.net/api/weather/v1/geocode/" + response.lat1 + "/" + response.long1 + "/forecast/hourly/48hour.json?units=m&language=en-US";
		request.get(callURL, {
			json: true
		},
		function (error, response, body) {
			console.log("forecast: " + body.forecasts);
			deviceClient.publish("status", "json", JSON.stringify(body.forecasts));
		});
		var stream = twitterClient.stream("statuses/filter", { locations: locationString });
		stream.on("data", function(event) {
			console.log(event && event.text);
			deviceClient.publish("status", "json", '{"d": {"text": ' + event.text + '}}');
		});
	}
	timesGetWeatherAndTweetsCalled++;
}

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

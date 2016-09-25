

'use strict';

// Module dependencies
var express    = require('express'),
  errorhandler = require('errorhandler'),
  bodyParser   = require('body-parser');

module.exports = function (app) {

  // Configure Express
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Setup static public directory
  app.use(express.static(__dirname + '/../public'));

  // Add error handling in dev
  if (!process.env.VCAP_SERVICES) {
    app.use(errorhandler());
  }

};
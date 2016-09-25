
'use strict';

var express = require('express'),
  app       = express(),
  request   = require('request'),
  path      = require('path'),
  bluemix   = require('./config/bluemix'),
  validator = require('validator'),
  watson    = require('watson-developer-cloud'),
  extend    = require('util')._extend,
  fs        = require('fs'),
  multer    = require('multer');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

var upload = multer({ storage: storage });

// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var visualRecognitionCredentials = extend({
  version: 'v1',
  url: "https://gateway-a.watsonplatform.net/visual-recognition/api",
  api_key: "bba89ab8e38a92175bf737667fa13cd7d330fe0c"
}, bluemix.getServiceCreds('watson_vision_combined')); // VCAP_SERVICES

console.log("visualRecognitionCredentials:"+JSON.stringify(visualRecognitionCredentials));

// Create the service wrapper
var visualRecognition = watson.watson_vision_combined(visualRecognitionCredentials);

// For local development, replace username and password
var textToSpeech = watson.text_to_speech({
  version: 'v1',
  url: 'https://stream.watsonplatform.net/text-to-speech/api',
  username: 'a45c75fe-638e-4c34-b583-d1629a78aa49',
  password: 'nU3NhjGtWLIH'
});


app.get('/api/synthesize', function(req, res, next) {
 // console.log("api/synthesize query:"+JSON.stringify(req.query));
  //example of query object
//  {"voice":"en-US_MichaelVoice","text":"This is what I see in the picture: Food, Burning, and, Fabric","download":"true","accept":"audio/flac"}

  var transcript = textToSpeech.synthesize(req.query);
  transcript.on('response', function(response) {
    if (req.query.download) {
      response.headers['content-disposition'] = 'attachment; filename=transcript.flac';
    }
  });
  transcript.on('error', function(error) {
    console.log("error " + error);
    next(error);
  });
  transcript.pipe(res);
});


app.post('/api/visual-recognition', upload.single('image'), function(req, res, next) {

  // Classifiers are 0 = all or a json = {label_groups:['<classifier-name>']}
  var classifier = req.body.classifier || '0';  // All
  if (classifier !== '0') {
    classifier = JSON.stringify({label_groups:[classifier]});
  }

  var imgFile;

  if (req.file) {
    // file image
    imgFile = fs.createReadStream(req.file.path);
  } else if(req.body.url && validator.isURL(req.body.url)) {
    // web image
    imgFile = request(req.body.url.split('?')[0]);
  } else if (req.body.url && req.body.url.indexOf('images') === 0) {
    // local image
    imgFile = fs.createReadStream(path.join('public', req.body.url));
  } else {
    // malformed url
    return next({ error: 'Malformed URL', code: 400 });
  }

  var formData = {
    labels_to_check: classifier,
    image_file: imgFile
  };

  visualRecognition.recognize(formData, function(err, result) {
    // delete the recognized file
    if(req.file)
      fs.unlink(imgFile.path);

    if (err)
      next(err);
    else
      return res.json(result);
  });
});


// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);

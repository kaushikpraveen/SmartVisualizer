/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
	//Nodejs app URL
	serverURL:"http://smartvisualizer.mybluemix.net",
    // Application Constructor
    initialize: function() {
        this.bindEvents();
		console.log("init");
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
		document.getElementById('btn_takePicture').addEventListener('click',this.takePicture,false);
		//document.getElementById('').addEventListener('',this.,false);
		
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
		console.log("deviceready");
		console.log(navigator.camera);
		console.log(FileTransfer);
		console.log(cordova.file);
		console.log(Media);
		app.welcome();
    },
	welcome:function(){
		console.log("welcome");
		//var welcomeAudioPath=(cordova.file.applicationDirectory+"");
		app.setMessage('Turn up the volume of the device and click on the "Take Picture" button');
		//app.playAudio(welcomeAudioPath);
	},
	setMessage: function(messageText){
		var messageLabel = document.getElementById('message');
		messageLabel.innerText=messageText;
	},
	showLoading:function(){
		$.mobile.loading('show');
		var analizingAudioPath=(cordova.file.applicationDirectory+"www/audio/analizing.flac");
		app.setMessage('Analizing image');
		app.playAudio(analizingAudioPath);
	},
	hideLoading:function(){
		$.mobile.loading( "hide" );
	},
	errormessage:function(){
		var errorAudioPath=(cordova.file.applicationDirectory+"www/audio/error.flac");
		app.playAudio(errorAudioPath);
	},
    takePicture: function(){
		console.log("take picture");		
		navigator.camera.getPicture(app.onTakePictureSuccess, app.onTakePictureFail, 
			{ 	
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI
			});
	},
	onTakePictureSuccess: function(imageData) {
		var image = document.getElementById('picture');
		console.log("onTakePictureSuccess - imageData:"+imageData)
		image.src = imageData;
		app.showLoading();
		app.getLabels(imageData);
	},
	onTakePictureFail:function(message) {
		var errorAudioPath=(cordova.file.applicationDirectory+"www/audio/picturefail.flac");
		app.setMessage('An error occured while taking the picture');
		app.playAudio(errorAudioPath);
	},
	authHeaderValue: function(username, password) {
		var tok = username + ':' + password;
		var hash = btoa(tok);
		return "Basic " + hash;
	},
	getLabels:function(imageURI) {
		var options = new FileUploadOptions();
		options.fileKey="image";
		options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var ft = new FileTransfer();
		ft.upload(imageURI,app.serverURL+"/api/visual-recognition", app.getLabelsSuccess, app.getLabelsFail, options);
	},

	getLabelsSuccess:function(r) {
		console.log("Code = " + r.responseCode);
		console.log("Response = " + r.response);
		console.log("Sent = " + r.bytesSent);
		var responseJSON = JSON.parse(r.response);
		var sentenceToSpeak =  app.getSentenceToSpeak(responseJSON.images[0].labels);
		app.setMessage(sentenceToSpeak);
		app.downloadAudioFile(sentenceToSpeak,app.playAudio);
	},

	getLabelsFail:function(error) {
		app.setMessage("An error has occurred while analizing the image - Check your internet connection");
		//alert("Check your connection to the internet");
		console.log("An error has occurred while getting labels: Code = " + error.code);
		console.log("upload error source " + error.source);
		console.log("upload error target " + error.target);
		app.hideLoading();
		app.errormessage();
	},

	getSentenceToSpeak:function(labelsJSON){
		console.log("labelsJSON:("+labelsJSON.length+")"+JSON.stringify(labelsJSON));
		var sentence="";
		for (var i=0;i<labelsJSON.length;i++){
			console.log("label_name:"+labelsJSON[i].label_name);
			if(i==0){
				//first label
				sentence = "This is what I see in the picture and the corresponding scores: " + labelsJSON[i].label_name + ", "+Math.round(labelsJSON[i].label_score*100) + "%";
			}
			else if(i==labelsJSON.length-1){
				//last label
				sentence=sentence+", and, " + labelsJSON[i].label_name  + ", "+Math.round(labelsJSON[i].label_score*100) + "%";
			}
			else{
				sentence=sentence+", " + labelsJSON[i].label_name  + ", "+Math.round(labelsJSON[i].label_score*100) + "%";
			}
			
		}
		console.log("Sentence:"+sentence);
		return sentence;
	},
	makeid:function(){
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 5; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	},
	downloadAudioFile:function(sentence,calback){
		var uri = encodeURI(app.serverURL+"/api/synthesize?voice=en-US_MichaelVoice&text="+sentence+"&download=true&accept=audio/flac");
		var audioCachePath=cordova.file.cacheDirectory+app.makeid()+".flac";
		
		console.log("Audio Download URI:"+uri);
		console.log("Audoi Cache filesystem path:"+audioCachePath);
		var fileTransfer = new FileTransfer();

		fileTransfer.download(
			uri,
			audioCachePath,
			function(entry) {
				console.log("download complete: " + entry.toURL());
				console.log("entry: " + JSON.stringify(entry));
				app.hideLoading();
				calback(entry.toURL());
			},
			function(error) {
				console.log("download error source " + error.source);
				console.log("download error target " + error.target);
				console.log("error code" + error.code);
				app.hideLoading();
				app.errormessage();
			},
			false
		);
	},
	playAudio:function(audioURI){
		audioURI=audioURI.replace("file://","");
		console.log("Play audio URI:"+audioURI);
			// Play the audio file at url
			var my_media = new Media(audioURI,
				// success callback
				function () {
					console.log("playAudio():Audio Success");
				},
				// error callback
				function (err) {
					app.setMessage("An error occured while trying to play the audio description");
					console.log("playAudio():Audio Error: " + err.code+" "+ err.message);
				}
			);
			// Play audio
			my_media.play();
	}
};

app.initialize();







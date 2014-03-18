#!/usr/bin/env node

var express = require('express');
var http = require('http')
var path = require('path');
var socketio = require('socket.io');
var util = require('util');
var utils = require('./utils');
var sync = require('./sync.server.js');

var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('syncedsounds123456789987654321'));
	app.use(express.session());
	app.use(app.router);
	app.use(require('stylus').middleware(__dirname + '/public'));
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

var webserver = http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

app.get('/', function (req, res){
	res.render('index', { title: 'Synced Sounds' });
});


// (server) Socket IO
var io = socketio.listen(webserver);
io.set('log level', 0);


sync.activate({io: io});



// send out some sounds:
function sendOutSound () {
	// send out sound, but add biggest travel time, so that the slowest client still plays the sound in sync
	// + add some time to make sure it doesn't arrive too early (currently 0.000)
	io.sockets.emit('playsound', sync.addTravelTime( Date.now()/1000 ) + 0.000 );
}

setInterval(sendOutSound, 2222);




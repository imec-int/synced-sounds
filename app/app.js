#!/usr/bin/env node

var express = require('express');
var http = require('http')
var path = require('path');
var socketio = require('socket.io');
var util = require('util');
var utils = require('./utils');

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



// syncing functions:
io.sockets.on('connection', function (socket) {
	console.log('[' + socket.handshake.address.address + '] user connected');

	socket.on('ping', function (clienttime, socketCallback) {

		// console.log('[' + socket.handshake.address.address + '] ping | clienttime: ' + Math.round(clienttime*1000));

		//respond immediatly:
		socketCallback({
			clienttime: clienttime,
			servertime: Date.now()/1000
		});
	});

	socket.on('traveltime', function (traveltime) {
		// just store the traveltime inside the socket:
		socket.traveltime = traveltime;
		console.log('[' + socket.handshake.address.address + '] traveltime: ' + Math.round(socket.traveltime*1000));
	});

	socket.on('disconnect', function() {
		console.log('[' + socket.handshake.address.address + '] user disconnected');
	});
});

function getBiggestTraveltime () {
	// find client with biggest travel time:
	var biggestTravelTime = 0;
	for (var i = io.sockets.clients().length - 1; i >= 0; i--) {
		var socket = io.sockets.clients()[i];
		if(!socket.traveltime) continue;
		if( socket.traveltime > biggestTravelTime){
			biggestTravelTime = socket.traveltime;
		}
	};
	return biggestTravelTime;
}


// send out some sounds:
function sendOutSound () {
	var biggestTravelTime = getBiggestTraveltime();

	console.log('biggestTravelTime: ' + Math.round(biggestTravelTime*1000));
	// send out sound, but add biggest travel time, so that the slowest client still plays the sound in sync
	// + add some time to make sure it doesn't arrive to early
	io.sockets.emit('playsound', Date.now()/1000 + biggestTravelTime + 0.010 );
}

setInterval(sendOutSound, 2222);




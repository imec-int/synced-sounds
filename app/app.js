#!/usr/bin/env node

var express = require('express');
var http = require('http')
var path = require('path');
var socketio = require('socket.io');
var socketclient = require('socket.io-client'); // to connect to our server
var utils = require('./utils');
var midimapping = require('./midimapping');

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


// Client Socket (speciaal om met onze mixmini te verbinden):
clientio = socketclient.connect('mixmini.mixlab.be', {port: 3000});

clientio.on('connect', function () {
	console.log("socket connected to mixmini.mixlab.be");
});

clientio.on('midi', function (rawmidiMessage) {
	var readableMessage = midimapping.parseMessage(rawmidiMessage);

	console.log(rawmidiMessage);
	console.log(readableMessage);

	io.sockets.emit('midi', readableMessage);
});



// syncing functions:
io.sockets.on('connection', function (socket) {
	console.log('[' + socket.handshake.address.address + '] user connected');

	socket.on('ping', function (clienttime, fn) {

		// console.log(clienttime);

		//respond:
		fn({
			clienttime: clienttime,
			servertime: Date.now()/1000
		});

	});

	socket.on("getRealServertime", function (traveltime, fn) {

		var now = Date.now()/1000;

		console.log('[' + socket.handshake.address.address + '] traveltime: ' + traveltime);

		fn({
			realServertime: now + traveltime,
			servertime: now
		});

		// store traveltime inside socket :-)
		socket.traveltime = traveltime;
	});

	socket.on('disconnect', function() {
		console.log('[' + socket.handshake.address.address + '] user disconnected');
	});
});


// send out some sounds:
function sendOutSound () {

	// find client with biggest travel time:
	var biggestTravelTime = 0;
	for (var i = io.sockets.clients().length - 1; i >= 0; i--) {
		var socket = io.sockets.clients()[i];
		if( socket.traveltime > biggestTravelTime){
			biggestTravelTime = socket.traveltime;
		}
	};
	console.log('biggestTravelTime: ' + biggestTravelTime);

	// send out sound, but add biggest travel time, so that the slowest client still plays the sound in sync
	io.sockets.emit('playsound', Date.now()/1000 + biggestTravelTime);
}



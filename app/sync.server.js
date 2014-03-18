exports.activate = function (options) {
	this.io = options.io;

	// syncing functions:
	this.io.sockets.on('connection', function (socket) {
		console.log('[' + socket.handshake.address.address + '] user connected');

		socket.on('sync.ping', function (clienttime, socketCallback) {

			// console.log('[' + socket.handshake.address.address + '] ping | clienttime: ' + Math.round(clienttime*1000));

			//respond immediatly:
			socketCallback({
				clienttime: clienttime,
				servertime: Date.now()/1000
			});
		});

		socket.on('sync.traveltime', function (traveltime) {
			// just store the traveltime inside the socket:
			socket.traveltime = traveltime;
			console.log('[' + socket.handshake.address.address + '] traveltime: ' + Math.round(socket.traveltime*1000));
		});

		socket.on('sync.cleartraveltime', function () {
			socket.traveltime = null;
			console.log('[' + socket.handshake.address.address + '] clearing traveltime');
		});


		socket.on('disconnect', function() {
			console.log('[' + socket.handshake.address.address + '] user disconnected');
		});
	});
}

exports.addTravelTime = function (time) {
	// find client with biggest travel time:
	var biggestTravelTime = 0;
	for (var i = this.io.sockets.clients().length - 1; i >= 0; i--) {
		var socket = this.io.sockets.clients()[i];
		if(!socket.traveltime) continue;
		if( socket.traveltime > biggestTravelTime){
			biggestTravelTime = socket.traveltime;
		}
	};

	console.log('biggestTravelTime: ' + Math.round(biggestTravelTime*1000));

	return time + biggestTravelTime;
}
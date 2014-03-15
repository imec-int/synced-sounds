var App = function (options){

	var socket;

	var init = function (){
		console.log("init");

		initSocket();
	};

	var initSocket = function (){
		if(socket) return; // already initialized

		socket = io.connect(window.location.hostname);

		// some debugging statements concerning socket.io
		socket.on('reconnecting', function(seconds){
			console.log('reconnecting in ' + seconds + ' seconds');
		});
		socket.on('reconnect', function(){
			console.log('reconnected');
		});
		socket.on('reconnect_failed', function(){
			console.log('failed to reconnect');
		});
		socket.on('connect', function() {
			console.log('connected');
		});

		socket.on('somecrazyevent', onSomecrazyevent);
		socket.on('midi', onMidi);
	};

	var onPlaysound = function (servertime) {
		// console.log('servertime', servertime);
		// console.log('timeoffset', timeoffset);

		var localplaytime = servertime - timeoffset;

		// console.log(localplaytime);

		noteOn(95, 100, 0, localplaytime);
		setTimeout(function () {
			noteOff(95, 100, 0);
		},500);
	};

	var onMidi = function (data) {
		console.log(data);
	};

	var noteOn = function(note, velocity, channel, playtime){
		if(!playtime) playtime = 0;

		var oscillator = context.createOscillator();
		var gainNode = context.createGainNode();
		if(0 <= channel && channel <= 3)
			// Sine wave is type = 0 -> default
			// Square wave is type = 1
			// Sawtooth wave is type = 2
			// Triangle wave is type = 3
			oscillator.type = channel;
		oscillator.frequency.value = 440 * Math.pow(2,(note-69)/12); //note to frequency mapping
		oscillator.connect(gainNode);
		gainNode.connect(context.destination);
		gainNode.gain.value = 0.1 + 0.9 * velocity / 127.0;
		if(notes[note]) notes[note].noteOff(0);
		notes[note] = oscillator;
		notes[note].noteOn(context.currentTime +  playtime);

		console.log( playtime );
		console.log( context.currentTime );
	}

	var noteOff = function(note, velocity, channel){
		if(notes[note]){
			notes[note].noteOff(0);
			notes[note] = null;
		}
	}

	var doTimingCalculations = function () {
		console.log('> syncing time with server');

		determineAveragePing(function (err, traveltime) {
			// console.log('traveltime: ', traveltime);

			getRealServerTime(traveltime, function (err, realServertime) {
				// console.log('realServertime: ', realServertime);

				// save the offset:
				timeoffset = realServertime - context.currentTime;

				// console.log('timeoffset: ', timeoffset);

				clearTimeout(timeoutObject)
				timeoutObject = setTimeout(function () {
					doTimingCalculations();
				},10000);
			});
		});
	};

	var determineAveragePing = function (callback) {
		var traveltimes = [];
		ping();

		function ping () {
			socket.emit('ping', context.currentTime, function (data) {

				// console.log(data);

				var currenttime = context.currentTime;
				var traveltime = (currenttime - data.clienttime)/2;
				traveltimes.push(traveltime);

				if(traveltimes.length == 10){
					// calculate average:
					var total = 0;
					for (var i = traveltimes.length - 1; i >= 0; i--) {
						total += traveltimes[i];
					};
					var averageTraveltime = total/traveltimes.length;
					if(callback) callback(null, averageTraveltime);

				}else{
					setTimeout(function () {
						ping();// do some more pings
					},100);
				}

			});
		} //end ping()

	};

	var getRealServerTime = function (traveltime, callback) {
		socket.emit('getRealServertime', traveltime, function (data) {
			console.log(data);
			callback(null, data.realServertime);
		});
	};


	return {
		init: init
	};
};



$(function(){
	var app = new App();
	app.init();
});


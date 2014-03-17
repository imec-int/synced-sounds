var App = function (options){

	var socket;
	var traveltimes = [];
	var traveltime = 0;
	var timeoffset = 0;
	var timingCalculationsActive = false;

	var context, bufferLoader;

	var init = function (){
		console.log("init");

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		context = new AudioContext();

		initSounds();
		initSocket();


		$('#playsound').click(function (event) {
			onPlaysound(0);
			doTimingCalculations();
		});
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
			doTimingCalculations();
		});

		socket.on('playsound', onPlaysound);
	};

	var doTimingCalculations = function () {
		// initialize webaudio context:
		if(context.currentTime == 0){
			setTimeout(function () {
				if(context.currentTime == 0){
					context.createGainNode();

					setTimeout(function () {
						if(context.currentTime == 0){
							alert("can't seem to start timing calculations using webkitAudioContext. Are you on a mobile device?");
						}else{
							determineTraveltime(context);
						}
					},10);
				}
			},10);
		}else{
			determineTraveltime();
		}
	};

	var determineTraveltime = function () {
		if(timingCalculationsActive) return;

		timingCalculationsActive = true;

		ping();

		function ping () {
			// console.log('ping', context.currentTime);

			socket.emit('ping', context.currentTime, function (data) {

				// console.log(data);

				var currenttime = context.currentTime;
				var currentTraveltime = (currenttime - data.clienttime)/2;

				// console.log('currentTraveltime', currentTraveltime);

				traveltimes.push(currentTraveltime);

				// only keep the last 10 traveltimes
				traveltimes = _.last(traveltimes, 10);

				// calculate average:
				var total = 0;
				for (var i = traveltimes.length - 1; i >= 0; i--) {
					total += traveltimes[i];
				};
				traveltime = total/traveltimes.length;

				// console.log('traveltimes', traveltimes);

				//inform the server of our traveltime:
				socket.emit('traveltime', traveltime);

				//determine difference between server and client time:

				// first: get real server time (so the servertime NOW) (that's the time of the server + the time it took for that value to get here):
				var realServertime = data.servertime + traveltime;

				// substract the clienttime from real servertime:
				timeoffset = realServertime - context.currentTime;

				// console.log('timeoffset', timeoffset, 'traveltime', traveltime);

				// now evertime we want the real server time, we can
				// add the timeoffset to the currentTime
				// or
				// if we get a servertime we can can
				// substract the timeoffset from that time

				setTimeout(function () {
					ping();// continue pinging
				},1000);

			});
		} //end ping()
	};

	var initSounds = function () {
		bufferLoader = new BufferLoader(
			context,
			['/sounds/snare.wav'],
			null,
			null,
			function (err) {
				return console.log(err);
			}
		);
		bufferLoader.load();
	}

	var onPlaysound = function (serverPlaytime) {


		var localPlaytime = serverPlaytime - timeoffset;

		var source = context.createBufferSource();
		source.buffer = bufferLoader.bufferList[0];
		console.log(bufferLoader.bufferList[0]);
		source.connect(context.destination);
		if (!source.start) source.start = source.noteOn;
		source.start(localPlaytime);

		console.log('playingsoud', serverPlaytime, timeoffset, localPlaytime);
	};


	return {
		init: init
	};
};



$(function(){
	var app = new App();
	app.init();
});


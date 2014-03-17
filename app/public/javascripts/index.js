var App = function (options){

	var pingEveryXMilliseconds = 700;

	var socket;
	var traveltimes = [];
	var timeoffset = null;
	var timingCalculationsActive = false;

	var context, sounds;

	var init = function (){
		console.log("init");

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		context = new AudioContext();

		initSounds();
		initSocket();


		$('#activate').click(function (event) {
			playSound(sounds[0]); // for iOS and other devices that want a song played before
			startTimingCalculations();
			$('#status').html('synced');
		});

		$('#deactivate').click(function (event) {
			stopTimingCalculations();
			$('#status').html('not synced');
		});

		$('#enableaudiocontext').click(function (event) {
			playSound(sounds[0]); // for iOS and other devices that want a song played before
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
		});

		socket.on('playsound', onPlaysound);
	};

	var startTimingCalculations = function () {
		if(timingCalculationsActive == true) return; //already in progress

		if(context.currentTime == 0) context.createGainNode(); //force start context

		timingCalculationsActive = true;

		ping();

		function ping () {
			if(!timingCalculationsActive) return;

			socket.emit('ping', context.currentTime, function (data) {

				var currenttime = context.currentTime;
				var currentTraveltime = (currenttime - data.clienttime)/2;

				traveltimes.push(currentTraveltime);

				// only keep the last 10 traveltimes
				traveltimes = _.last(traveltimes, 10);

				// calculate average:
				var total = 0;
				for (var i = traveltimes.length - 1; i >= 0; i--) {
					total += traveltimes[i];
				};
				var traveltime = total/traveltimes.length;

				console.log('traveltime', Math.round(traveltime*1000));

				//inform the server of our traveltime:
				socket.emit('traveltime', traveltime);

				//determine difference between server and client time:

				// first: get real server time (so the servertime NOW) (that's the time of the server + the time it took for that value to get here):
				var realServertime = data.servertime + traveltime;

				// substract the clienttime from real servertime:
				timeoffset = realServertime - context.currentTime;

				// now evertime we want the real server time, we can
				// add the timeoffset to the currentTime
				// or
				// if we get a servertime we can can
				// substract the timeoffset from that time

				setTimeout(function () {
					ping();// continue pinging
				},pingEveryXMilliseconds);

			});
		} //end ping()
	};

	var getLocalPlaytime = function (serverPlaytime) {
		if(timeoffset == null)
			return context.currentTime;
		else
			return serverPlaytime - timeoffset;
	};

	var stopTimingCalculations = function () {
		timingCalculationsActive = false;
		socket.emit('cleartraveltime'); //dont use my traveltime anymore
	};

	var initSounds = function () {
		bufferLoader = new BufferLoader(
			context,
			[
				'/sounds/silence.wav',
				'/sounds/snare.wav'
			],
			function (bufferlist) {
				sounds = bufferlist;
			},
			null,
			function (err) {
				return console.log(err);
			}
		);
		bufferLoader.load();
	}

	var onPlaysound = function (serverPlaytime) {
		var localPlaytime = getLocalPlaytime(serverPlaytime);
		playSound(sounds[1], localPlaytime);
	};

	var playSound = function (bufferSource, contexttime) {
		var source = context.createBufferSource();
		source.buffer = bufferSource;
		source.connect(context.destination);
		if (!source.start) source.start = source.noteOn;

		if(contexttime === undefined || contexttime === null) contexttime = context.currentTime;

		var delaytime = contexttime - context.currentTime;
		setTimeout(blinkBackground, delaytime);
		console.log('delaytime', Math.round(delaytime*1000));

		source.start(contexttime);


	};

	var blinkBackground = function () {
		$('body').addClass('blink');
		setTimeout(function () {
			$('body').removeClass('blink');
		},200);
	}


	return {
		init: init
	};
};



$(function(){
	var app = new App();
	app.init();
});


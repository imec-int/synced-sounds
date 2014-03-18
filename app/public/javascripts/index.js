var App = function (options){

	var socket;
	var sync;

	var context, sounds;

	var init = function (){
		console.log("init");

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		context = new AudioContext();

		initSounds();
		initSocket();

		sync = new Sync({
			socket: socket,
			audioContext: context,
			pingtime: 700
		});


		$('#activate').click(function (event) {
			playSound(sounds[0]); // for iOS and other devices that want a song played before
			sync.activate();
			$('#status').html('synced');
		});

		$('#deactivate').click(function (event) {
			sync.deactivate();
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
		var localPlaytime = sync.getLocalEventTime(serverPlaytime);
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
	};

	return {
		init: init
	};
};



$(function(){
	var app = new App();
	app.init();
});


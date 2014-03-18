var Sync = function (options){

	var pingtime = options.pingtime;
	var audioContext = options.audioContext;
	var socket = options.socket;

	var traveltimes = [];
	var timeoffset = null;
	var timingCalculationsActive = false;



	var activate = function () {
		if(timingCalculationsActive == true) return; //already in progress

		if(audioContext.currentTime == 0) audioContext.createGainNode(); //force start audioContext

		timingCalculationsActive = true;

		ping();

		function ping () {
			if(!timingCalculationsActive) return;

			socket.emit('sync.ping', audioContext.currentTime, function (data) {

				var currenttime = audioContext.currentTime;
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
				socket.emit('sync.traveltime', traveltime);

				//determine difference between server and client time:

				// first: get real server time (so the servertime NOW) (that's the time of the server + the time it took for that value to get here):
				var realServertime = data.servertime + traveltime;

				// substract the clienttime from real servertime:
				timeoffset = realServertime - audioContext.currentTime;

				// now evertime we want the real server time, we can
				// add the timeoffset to the currentTime
				// or
				// if we get a servertime we can can
				// substract the timeoffset from that time

				setTimeout(function () {
					ping();// continue pinging
				},options.pingtime);

			});
		} //end ping()
	};

	var deactivate = function () {
		timingCalculationsActive = false;
		socket.emit('sync.cleartraveltime'); //dont use my traveltime anymore
	};

	var getLocalEventTime = function (serverEventTime) {
		if(timeoffset == null) return audioContext.currentTime;

		return serverEventTime - timeoffset;
	};

	var getServerTime = function () {
		if(timeoffset == null) return null;

		return audioContext.currentTime + timeoffset;
	};


	return {
		activate: activate,
		deactivate: deactivate,
		getLocalEventTime: getLocalEventTime,
		getServerTime: getServerTime
	};
};




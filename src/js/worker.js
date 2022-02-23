/** @define {boolean} */
var FOROUTPUT = false;
if(!FOROUTPUT){
	self.importScripts("worker-const.js");
}

window = self;
/** @type {number} */
self.parallel = 1;
/** @type {Array<WorkerInfo>} */
self.actlist = [];
/** @type {Array<Worker>} */
self.wklist = [];

function startWorker(){
	while(self.wklist.length < self.parallel && self.actlist.length > 0){
		/** @type {WorkerInfo} */
		var wi = self.actlist.shift();
		/** @type {Worker} */
		var wk = new Worker("worker-sub.js");
		wk.inf = wi;
		wk.addEventListener("message", handleStepInfo);
		self.wklist.push(wk);
		wk.postMessage(wk.inf);
	}
}

/**
 * @param {Event} evt
 */
function handleStepInfo(evt){
	var wkinf = /** @type {WorkerInfo} */(evt.target.inf);
	var spinf = /** @type {WorkerStepInfo} */(evt.data);
	spinf._rowIdx = wkinf._rowIdx;
	if(spinf._type == StepInfoType.DONE || spinf._type == StepInfoType.CANCELED){
		/** @type {number} */
		var idx = findWorker(wkinf);
		if(idx >= 0){
			self.wklist[idx].terminate();
			self.wklist.splice(idx, 1);
			startWorker();
		}
		if(self.actlist.length == 0 && self.wklist.length == 0){
			spinf._finished = true;
		}
	}
	self.postMessage(spinf);
}

/**
 * @param {WorkerInfo} wkinf
 * @return {number} Index of worker
 */
function findWorker(wkinf){
	/** @type {number} */
	var i = 0;
	for(i=0; i<self.wklist.length; i++){
		if(self.wklist[i].inf._rowIdx == wkinf._rowIdx){
			return i;
		}
	}
	return -1;
}

self.addEventListener("message", function(msg){
	var wkinf = /** @type {WorkerInfo} */(msg.data);
	switch(wkinf._type){
	case WorkerInfoType.SETPCNT:
		if(wkinf._palcnt){
			self.parallel = wkinf._palcnt;
		}
		break;
	case WorkerInfoType.DOWNLOAD:
	case WorkerInfoType.UPLOAD:
		self.actlist.push(wkinf);
		startWorker();
		break;
	default:
		/** @type {number} */
		var idx = findWorker(wkinf);
		if(idx >= 0){
			self.wklist[idx].postMessage(wkinf);
		}
	}
});

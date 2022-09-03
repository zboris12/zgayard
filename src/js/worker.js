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
/** @type {string} */
self.token = "";

function startWorker(){
	while(self.wklist.length < self.parallel && self.actlist.length > 0){
		/** @type {WorkerInfo} */
		var wi = self.actlist.shift();
		if(self.token){
			wi.cominf.gtoken = self.token;
		}
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
	spinf.rowIdx = wkinf.rowIdx;
	if(spinf.gtoken){
		self.token = spinf.gtoken;
	}
	if(spinf.type == StepInfoType.DONE || spinf.type == StepInfoType.CANCELED){
		/** @type {number} */
		var idx = findWorker(wkinf);
		if(idx >= 0){
			self.wklist[idx].terminate();
			self.wklist.splice(idx, 1);
			startWorker();
		}
		if(self.actlist.length == 0 && self.wklist.length == 0){
			spinf.fined = true;
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
		if(self.wklist[i].inf.rowIdx == wkinf.rowIdx){
			return i;
		}
	}
	return -1;
}

self.addEventListener("message", function(msg){
	var wkinf = /** @type {WorkerInfo} */(msg.data);
	switch(wkinf.type){
	case WorkerInfoType.SETPCNT:
		if(wkinf.palcnt){
			self.parallel = wkinf.palcnt;
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

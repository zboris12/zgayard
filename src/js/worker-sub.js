window = self;
/** @define {string} */
const WORKER_PATH = "../";
/** @define {boolean} */
var FOROUTPUT = false;
self.importScripts(WORKER_PATH+"vendor/forge.min.js");
if(!FOROUTPUT){
	self.importScripts("zbcommon.js");
	self.importScripts("zbcrypto.js");
	self.importScripts("zbidxdb.js");
	self.importScripts("zbdrive.js");
	self.importScripts("zbonedrive.js");
	self.importScripts("zbgoogledrive.js");
	self.importScripts("zbidxbdrive.js");
	self.importScripts("const.js");
	self.importScripts("worker-const.js");
	self.importScripts("downup.js");
}

/** @type {boolean} */
self.canceled = false;

/**
 * @param {AesSecrets} keycfg
 * @param {ZbDrive} drv
 * @return {ZbTransfer}
 */
function createTransfer(keycfg, drv){
	/** @type {ZbTransfer} */
	var tfr = new ZbTransfer(keycfg, /** @type {function():boolean} */(function(){
		return self.canceled;
	}), /** @type {function(WorkerStepInfo)} */(function(a_spinf){
		if(a_spinf.type == StepInfoType.DONE){
			a_spinf.gtoken = drv.getToken();
		}
		self.postMessage(a_spinf);
	}));
	return tfr;
}

/**
 * @param {WorkerInfo} wkinf
 * @return {!Promise<void>}
 */
async function work(wkinf){
	/** @type {WorkerInfoType} */
	var wtyp = wkinf.type;
	var cinf = /** @type {WorkerCommonInfo} */(wkinf.cominf);
	/** @type {AesSecrets} */
	var keycfg = {
		iv: base64urlToRaw(cinf.iv),
		key: base64urlToRaw(cinf.key),
	};
	/** @type {WorkerStepInfo} */
	var stepinf = {
		type: StepInfoType.BEGIN,
		wtype: wtyp,
		size: 0,
	};
	self.postMessage(stepinf);

	/** @type {ZbLocalStorage} */
	var stg = new ZbLocalStorage();
	await stg.initIdxDb().catch(function(a_err){
		console.error("IndexedDB is not supported in your browser settings.", a_err);
	});
	/** @type {ZbDriveDefine} */
	var a_drvdef = g_DRIVES[cinf.drvid];
	if(a_drvdef){
		/** @type {ZbDrive} */
		var a_drv = a_drvdef.newDriveInstance(stg, g_AUTHURL);
		a_drv.presetToken(cinf.gtoken);

		switch(wtyp){
		case WorkerInfoType.DOWNLOAD:
			var a_downinf = /** @type {WorkerDownloadInfo} */(wkinf.downinf);
			/** @type {ZbTransfer} */
			var a_tfr1 = createTransfer(keycfg, a_drv);
			await a_tfr1.downloadFile(a_drv, a_downinf.targetId);
			break;
		case WorkerInfoType.UPLOAD:
			var a_upinf = /** @type {WorkerUploadInfo} */(wkinf.upinf);
			/** @type {ZbTransfer} */
			var a_tfr2 = createTransfer(keycfg, a_drv);
			await a_tfr2.uploadFile(a_drv, a_upinf.fname, a_upinf.file, a_upinf.ptid);
			break;
		}

	}else{
		/** @type {WorkerStepInfo} */
		var a_stepinf = {
			type: StepInfoType.DONE,
			wtype: wtyp,
			size: 0,
			errr: "Drive's name is invalid.",
		};
		self.postMessage(a_stepinf);
	}
}

self.addEventListener("message", function(evt){
	var wkinf = /** @type {WorkerInfo} */(evt.data);
	switch(wkinf.type){
	case WorkerInfoType.DOWNLOAD:
	case WorkerInfoType.UPLOAD:
		work(wkinf);
		break;
	default:
		self.canceled = true;
	}
});

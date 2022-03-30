/** @define {boolean} */
var FOROUTPUT = false;
if(!FOROUTPUT){
	self.importScripts("/vendor/crypto-js.js");
	self.importScripts("zbcommon.js");
	self.importScripts("zbcrypto.js");
	self.importScripts("zbidxdb.js");
	self.importScripts("zbdrive.js");
	self.importScripts("zbonedrive.js");
	self.importScripts("zbgoogledrive.js");
	self.importScripts("const.js");
	self.importScripts("worker-const.js");
	self.importScripts("downup.js");
}

window = self;
/** @type {boolean} */
self.canceled = false;

/**
 * @param {CipherParams} keycfg
 * @param {ZbDrive} drv
 * @return {ZbTransfer}
 */
function createTransfer(keycfg, drv){
	/** @type {ZbTransfer} */
	var tfr = new ZbTransfer(keycfg, /** @type {function():boolean} */(function(){
		return self.canceled;
	}), /** @type {function(WorkerStepInfo)} */(function(a_spinf){
		if(a_spinf._type == StepInfoType.DONE){
			a_spinf._token = drv.getToken();
		}
		self.postMessage(a_spinf);
	}));
	return tfr;
}

/**
 * @param {WorkerInfo} wkinf
 */
function work(wkinf){
	/** @type {WorkerInfoType} */
	var wtype = wkinf._type;
	var cominf = /** @type {WorkerCommonInfo} */(wkinf._cominf);
	var keycfg = /** @type {CipherParams} */({
		"iv": CryptoJS.enc.Base64url.parse(cominf._iv),
		"key": CryptoJS.enc.Base64url.parse(cominf._key),
	});
	/** @type {WorkerStepInfo} */
	var stepinf = {
		_type: StepInfoType.BEGIN,
		_wtype: wtype,
		_size: 0,
	};
	self.postMessage(stepinf);

	/** @type {ZbLocalStorage} */
	var stg = new ZbLocalStorage();
	stg.initIdxDb(function(a_err){
		if(a_err){
			console.error("IndexedDB is not supported in your browser settings.");
		}
		/** @type {ZbDriveDefine} */
		var a_drvdef = g_DRIVES[cominf._drvnm];
		if(a_drvdef){
			/** @type {ZbDrive} */
			var a_drv = a_drvdef.newDriveInstance(stg, g_AUTHURL);
			a_drv.presetToken(cominf._token);

			switch(wtype){
			case WorkerInfoType.DOWNLOAD:
				var a_downinf = /** @type {WorkerDownloadInfo} */(wkinf._downinf);
				/** @type {ZbTransfer} */
				var a_tfr1 = createTransfer(keycfg, a_drv);
				a_tfr1.downloadFile(a_drv, a_downinf._targetId);
				break;
			case WorkerInfoType.UPLOAD:
				var a_upinf = /** @type {WorkerUploadInfo} */(wkinf._upinf);
				/** @type {ZbTransfer} */
				var a_tfr2 = createTransfer(keycfg, a_drv);
				a_tfr2.uploadFile(a_drv, a_upinf._fname, a_upinf._file, a_upinf._parentId);
				break;
			}

		}else{
			/** @type {WorkerStepInfo} */
			var a_stepinf = {
				_type: StepInfoType.DONE,
				_wtype: wtype,
				_size: 0,
				_err: "Drive's name is invalid.",
			};
			self.postMessage(a_stepinf);
		}
	});
}

self.addEventListener("message", function(evt){
	var wkinf = /** @type {WorkerInfo} */(evt.data);
	switch(wkinf._type){
	case WorkerInfoType.DOWNLOAD:
	case WorkerInfoType.UPLOAD:
		work(wkinf);
		break;
	default:
		self.canceled = true;
	}
});

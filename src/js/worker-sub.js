/** @define {boolean} */
var FOROUTPUT = false;
if(!FOROUTPUT){
	self.importScripts("/vendor/crypto-js.js");
	self.importScripts("zbcommon.js");
	self.importScripts("zbcrypto.js");
	self.importScripts("zbidxdb.js");
	self.importScripts("zbonedrive.js");
	self.importScripts("const.js");
	self.importScripts("worker-const.js");
}

window = self;
/** @type {boolean} */
self.canceled = false;

/**
 * @param {WorkerCommonInfo} cominf
 * @param {function(ZBDrive)} func
 */
function prepareDrive(cominf, func){
	/** @type {ZbLocalStorage} */
	var stg = new ZbLocalStorage();
	stg.initIdxDb(function(a_err){
		if(a_err){
			console.error("IndexedDB is not supported in your browser settings.");
		}
		/** @type {DriveDefine} */
		var a_drvdef = g_DRIVES[cominf._drvnm];
		if(a_drvdef){
			/** @type {ZBDrive} */
			var a_drv = a_drvdef._newInstance(stg, g_AUTHURL, g_RELAYURL);
			a_drv.presetToken(cominf._token);
			func(a_drv);
		}else{
			/** @type {WorkerStepInfo} */
			var a_stepinf = {
				_type: StepInfoType.DONE,
				_wtype: self._wtype,
				_size: 0,
				_err: "Drive's name is invalid.",
			};
			self.postMessage(a_stepinf);
		}
	});
}

/**
 * @param {WorkerInfo} wkinf
 */
function work(wkinf){
	/** @type {WorkerInfoType} */
	self._wtype = wkinf._type;
	var cominf = /** @type {WorkerCommonInfo} */(wkinf._cominf);
	self._keycfg = /** @type {CipherParams} */({
		"iv": CryptoJS.enc.Base64url.parse(cominf._iv),
		"key": CryptoJS.enc.Base64url.parse(cominf._key),
	});
	/** @type {WorkerStepInfo} */
	var stepinf = {
		_type: StepInfoType.BEGIN,
		_wtype: self._wtype,
		_size: 0,
	};
	self.postMessage(stepinf);
	prepareDrive(cominf, /** @type {function(ZBDrive)} */(function(a_drv){
		switch(wkinf._type){
		case WorkerInfoType.DOWNLOAD:
			var a_downinf = /** @type {WorkerDownloadInfo} */(wkinf._downinf);
			downloadFile(a_drv, a_downinf._targetId);
			break;
		case WorkerInfoType.UPLOAD:
			var a_upinf = /** @type {WorkerUploadInfo} */(wkinf._upinf);
			uploadFile(a_drv, cominf, a_upinf._fpath, a_upinf._file, a_upinf._baseId, a_upinf._basePath);
			break;
		}
	}));
}

/**
 * @param {ZBReader} reader
 * @param {ZBWriter} writer
 * @param {boolean=} decrypt
 */
function startWork(reader, writer, decrypt){
	/** @type {ZbCrypto} */
	var cypt = new ZbCrypto({
		_decrypt: decrypt,
		_keycfg: self._keycfg,
		_reader: reader,
		_writer: writer,
	});
	/** @type {function():boolean} */
	cypt.onstep = function(){
		/** @type {WorkerStepInfo} */
		var a_stepinf = {
			_type: StepInfoType.INPROGRESS,
			_wtype: self._wtype,
			_speed: cypt.calSpeed(),
			_pos: reader.getPos(),
			_size: reader.getSize(),
		};
		self.postMessage(a_stepinf);
		if(self.canceled){
			return false;
		}else{
			return true;
		}
	};

	cypt.onfinal = /** @type {function(*=, boolean=)} */(function(a_err, a_canceled){
		/** @type {WorkerStepInfo} */
		var a_stepinf = {
			_type: StepInfoType.DONE,
			_wtype: self._wtype,
			_size: writer.getTotalSize(),
		};
		if(a_err){
			a_stepinf._err = a_err.message || a_err.restxt;
		}else if(a_canceled){
			a_stepinf._type = StepInfoType.CANCELED;
		}else if(writer.getBufferBlob){
			a_stepinf._blob = writer.getBufferBlob();
		}
		self.postMessage(a_stepinf);
	});
	cypt.start();
}

/**
 * @param {ZBDrive} drv
 * @param {string} tid
 */
function downloadFile(drv, tid){
	/** @type {ZBReader} */
	var reader = drv.createReader({
		_id: tid,
		_bufSize: 1600000,
	});
	/** @type {ZBlobWriter} */
	var writer = new ZBlobWriter();
	startWork(reader, writer, true);
}

/**
 * @param {ZBDrive} drv
 * @param {WorkerCommonInfo} cominf
 * @param {string} fpath
 * @param {File} file
 * @param {string} baseId
 * @param {string} basePath
 */
function uploadFile(drv, cominf, fpath, file, baseId, basePath){
	/** @type {Array<string>} */
	var farr = fpath.split("/");
	if(cominf._encfname){
		for(var i=0; i < farr.length; i++){
			farr[i] = zbEncryptString(farr[i], self._keycfg);
		}
	}

	/** @type {ZBlobReader} */
	var reader = new ZBlobReader({
		_blob: file,
		_bufSize: 1600000,
	});
	/** @type {DriveWriterOption} */
	var wopt = {
		_fnm: farr[0],
		_fldrId: baseId,
	};
	if(farr.length > 1){
		wopt._fnm = farr.join("/");
		wopt._fldr = basePath;
	}
	/** @type {ZBWriter} */
	var writer = drv.createWriter(wopt);
	startWork(reader, writer);
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

/**
 * @constructor
 * @param {CipherParams} keycfg
 * @param {function():boolean} isCancelFunc
 * @param {function(WorkerStepInfo)} sendSpInfFunc
 */
function ZbTransfer(keycfg, isCancelFunc, sendSpInfFunc){
	/** @private @type {ZBReader} */
	this.reader = null;
	/** @private @type {ZBWriter} */
	this.writer = null;
	/** @private @type {CipherParams} */
	this.keycfg = keycfg;
	/** @private @type {WorkerInfoType} */
	this.wktype = WorkerInfoType.DOWNLOAD;

	/** @public @type {function():boolean} */
	this.isCanceled = isCancelFunc;
	/** @public @type {function(WorkerStepInfo)} */
	this.sendStepInfo = sendSpInfFunc;

	/**
	 * @private
	 */
	this.startTransfer = function(){
		/** @type {ZbCrypto} */
		var cypt = new ZbCrypto({
			_decrypt: (this.wktype == WorkerInfoType.DOWNLOAD),
			_keycfg: this.keycfg,
			_reader: this.reader,
			_writer: this.writer,
		});
		/** @type {function():boolean} */
		cypt.onstep = function(){
			/** @type {WorkerStepInfo} */
			var a_stepinf = {
				_type: StepInfoType.INPROGRESS,
				_wtype: this.wktype,
				_speed: cypt.calSpeed(),
				_pos: this.reader.getPos(),
				_size: this.reader.getSize(),
			};
			this.sendStepInfo(a_stepinf);
			if(this.isCanceled()){
				return false;
			}else{
				return true;
			}
		}.bind(this);

		cypt.onfinal = /** @type {function(*=, boolean=)} */(function(a_err, a_canceled){
			/** @type {WorkerStepInfo} */
			var a_stepinf = {
				_type: StepInfoType.DONE,
				_wtype: this.wktype,
				_size: this.writer.getTotalSize(),
			};
			if(a_err){
				a_stepinf._err = a_err.message || a_err.restxt;
			}else if(a_canceled){
				a_stepinf._type = StepInfoType.CANCELED;
			}else if(this.writer.getBufferBlob){
				a_stepinf._blob = this.writer.getBufferBlob();
			}
			this.sendStepInfo(a_stepinf);
		}.bind(this));
		cypt.start();
	};

	/**
	 * @public
	 * @param {ZBDrive} drv
	 * @param {string} tid
	 */
	this.downloadFile = function(drv, tid){
		/** @type {WorkerInfoType} */
	 	this.wktype = WorkerInfoType.DOWNLOAD;
		/** @type {ZBlobReader} */
		this.reader = drv.createReader({
			_id: tid,
			_bufSize: 1600000,
		});
		/** @type {ZBlobWriter} */
		this.writer = new ZBlobWriter();
		this.startTransfer();
	};

	/**
	 * @public
	 * @param {ZBDrive} drv
	 * @param {boolean} encfname
	 * @param {string} fpath
	 * @param {File} file
	 * @param {string} baseId
	 * @param {string} basePath
	 */
	this.uploadFile = function(drv, encfname, fpath, file, baseId, basePath){
		/** @type {Array<string>} */
		var farr = fpath.split("/");
		if(encfname){
			for(var i=0; i < farr.length; i++){
				farr[i] = zbEncryptString(farr[i], this.keycfg);
			}
		}

		/** @type {WorkerInfoType} */
	 	this.wktype = WorkerInfoType.UPLOAD;
		/** @type {ZBlobReader} */
		this.reader = new ZBlobReader({
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
		this.writer = drv.createWriter(wopt);
		this.startTransfer();
	};
}

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
	/** @private @type {number} */
	this.begintime = 0;

	/**
	 * @private
	 */
	this.startTransfer = function(){
		/** @type {WorkerStepInfo} */
		var stepinf = {
			type: StepInfoType.BEGIN,
			wtype: this.wktype,
			size: this.reader.getSize(),
		};
		this.sendStepInfo(stepinf);
		/** @type {ZbCrypto} */
		var cypt = new ZbCrypto({
			_decrypt: (this.wktype == WorkerInfoType.DOWNLOAD),
			_keycfg: this.keycfg,
			_reader: this.reader,
			_writer: this.writer,
		});

		/** @type {function():boolean} */
		var onstep = function(){
			/** @type {WorkerStepInfo} */
			var a_stepinf = {
				type: StepInfoType.INPROGRESS,
				wtype: this.wktype,
				begin: this.begintime,
				spd: cypt.calSpeed(),
				posn: this.reader.getPos(),
				size: this.reader.getSize(),
			};

			this.sendStepInfo(a_stepinf);
			if(this.isCanceled()){
				return false;
			}else{
				return true;
			}
		}.bind(this);

		var donefunc = /** @type {function(*=, boolean=)} */(function(a_err, a_done){
			/** @type {WorkerStepInfo} */
			var a_stepinf = {
				type: StepInfoType.DONE,
				wtype: this.wktype,
				begin: this.begintime,
				posn: this.reader.getPos(),
				size: this.writer.getTotalSize(),
			};
			if(a_err){
				a_stepinf.errr = a_err.message || a_err.restxt;
			}else if(!a_done){
				a_stepinf.type = StepInfoType.CANCELED;
			}else if(this.writer.getBufferBlob){
				a_stepinf.blob = this.writer.getBufferBlob();
			}
			this.sendStepInfo(a_stepinf);
		}.bind(this));

		this.begintime = Date.now();
		cypt.start(0, onstep).then(function(a_done){
			donefunc(undefined, a_done);
		}).catch(function(a_err){
			donefunc(a_err);
		});
	};

	/**
	 * @public
	 * @param {ZbDrive} drv
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
	 * @param {ZbDrive} drv
	 * @param {string} fnm
	 * @param {File} file
	 * @param {string} fldrId
	 */
	this.uploadFile = function(drv, fnm, file, fldrId){
		/** @type {WorkerInfoType} */
		this.wktype = WorkerInfoType.UPLOAD;
		/** @type {ZBlobReader} */
		this.reader = new ZBlobReader({
			_blob: file,
			_bufSize: 1600000,
		});
		/** @type {DriveWriterOption} */
		var wopt = {
			_fnm: fnm,
			_fldrId: fldrId,
		};
		/** @type {ZBWriter} */
		this.writer = drv.createWriter(wopt);
		this.startTransfer();
	};
}

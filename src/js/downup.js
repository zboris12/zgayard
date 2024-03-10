/**
 * @constructor
 * @param {AesSecrets} keycfg
 * @param {function():boolean} isCancelFunc
 * @param {function(WorkerStepInfo)} sendSpInfFunc
 */
function ZbTransfer(keycfg, isCancelFunc, sendSpInfFunc){
	/** @private @type {ZBReader} */
	this.reader = null;
	/** @private @type {ZBWriter} */
	this.writer = null;
	/** @private @type {AesSecrets} */
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
	 * @return {!Promise<void>}
	 */
	this.startTransfer = async function(){
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

		this.begintime = Date.now();
		/** @type {*} */
		var err = null;
		/** @type {boolean|undefined} */
		var done = await cypt.start(0, onstep).catch(function(a_err){
			err = a_err;
		});
		stepinf = {
			type: StepInfoType.DONE,
			wtype: this.wktype,
			begin: this.begintime,
			posn: this.reader.getPos(),
			size: this.writer.getTotalSize(),
		};
		if(err){
			stepinf.errr = err.message || err.restxt;
		}else if(!done){
			stepinf.type = StepInfoType.CANCELED;
		}else if(this.writer.getBufferBlob){
			stepinf.blob = this.writer.getBufferBlob();
		}
		this.sendStepInfo(stepinf);
	};

	/**
	 * @public
	 * @param {ZbDrive} drv
	 * @param {string} tid
	 * @return {!Promise<void>}
	 */
	this.downloadFile = async function(drv, tid){
		/** @type {WorkerInfoType} */
	 	this.wktype = WorkerInfoType.DOWNLOAD;
		/** @type {ZBlobReader} */
		this.reader = drv.createReader({
			_id: tid,
			_bufSize: 1600000,
		});
		/** @type {ZBlobWriter} */
		this.writer = new ZBlobWriter();
		await this.startTransfer();
	};

	/**
	 * @public
	 * @param {ZbDrive} drv
	 * @param {string} fnm
	 * @param {File} file
	 * @param {string} fldrId
	 * @return {!Promise<void>}
	 */
	this.uploadFile = async function(drv, fnm, file, fldrId){
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
		await this.startTransfer();
	};
}

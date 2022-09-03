/**
 * @fileoverview This is an externs file.
 * @externs
 */

/**
 * @param {string} libnm
 * @return {*}
 */
function zb_require(libnm){}
/**
 * @param {*} ctor
 * @param {*} superCtor
 */
function zb_inherits(ctor, superCtor){}

/**
 * @constructor
 * @extends {stream.ReadableStream}
 */
function ZbSubReadable(){};
/** @public @type {function():*} */
ZbSubReadable.prototype.getSuperClass;
/** @public @type {function(...*):*} */
ZbSubReadable.prototype.super;
/** @public @type {function(string, ...*):*} */
ZbSubReadable.prototype.superCall;

/**
 * @typedef
 * {{
 *    _mediaSource: MediaSource,
 * }}
 */
var MediaElementWrapper;

/**
 * @constructor
 * @param {VDStreamWrapper} strm
 * @param {Element} vdo
 */
function VideoStream(strm, vdo){
	/** @public @type {MediaElementWrapper} */
	this._elemWrapper;
};

/** @interface */
function VDStreamWrapper(){
	/**
	 * @public
	 * @param {Object<string, number>=} opts
	 * @return {stream.ReadableStream}
	 */
	this.createReadStream = function(opts){}
}

/**
 * @typedef
 * {{
 *    type: WorkerInfoType,
 *    palcnt: (number|undefined),
 *    rowIdx: (number|undefined),
 *    cominf: (WorkerCommonInfo|undefined),
 *    downinf: (WorkerDownloadInfo|undefined),
 *    upinf: (WorkerUploadInfo|undefined),
 * }}
 */
var WorkerInfo;
/**
 * @typedef
 * {{
 *    gtoken: string,
 *    iv: string,
 *    key: string,
 *    drvid: string,
 * }}
 */
var WorkerCommonInfo;
/**
 * @typedef
 * {{
 *    fname: string,
 *    file: File,
 *    ptid: string,
 * }}
 */
var WorkerUploadInfo;
/**
 * @typedef
 * {{
 *    targetId: string,
 * }}
 */
var WorkerDownloadInfo;
/**
 * @typedef
 * {{
 *    type: StepInfoType,
 *    wtype: WorkerInfoType,
 *    rowIdx: (number|undefined),
 *    begin: (number|undefined),
 *    spd: (number|undefined),
 *    posn: (number|undefined),
 *    size: number,
 *    blob: (!Blob|undefined),
 *    errr: (string|undefined),
 *    gtoken: (string|undefined),
 *    fined: (boolean|undefined),
 * }}
 */
var WorkerStepInfo;

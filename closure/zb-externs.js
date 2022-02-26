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
 * @constructor
 * @param {VDStreamWrapper} strm
 * @param {Element} vdo
 */
function VideoStream(strm, vdo){};

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
 *    _type: WorkerInfoType,
 *    _palcnt: (number|undefined),
 *    _rowIdx: (number|undefined),
 *    _cominf: (WorkerCommonInfo|undefined),
 *    _downinf: (WorkerDownloadInfo|undefined),
 *    _upinf: (WorkerUploadInfo|undefined),
 * }}
 */
var WorkerInfo;
/**
 * @typedef
 * {{
 *    _token: string,
 *    _iv: string,
 *    _key: string,
 *    _drvnm: string,
 *    _encfname: boolean,
 * }}
 */
var WorkerCommonInfo;
/**
 * @typedef
 * {{
 *    _fpath: string,
 *    _file: File,
 *    _baseId: string,
 *    _basePath: string,
 * }}
 */
var WorkerUploadInfo;
/**
 * @typedef
 * {{
 *    _targetId: string,
 * }}
 */
var WorkerDownloadInfo;
/**
 * @typedef
 * {{
 *    _type: StepInfoType,
 *    _wtype: WorkerInfoType,
 *    _rowIdx: (number|undefined),
 *    _speed: (string|undefined),
 *    _pos: (number|undefined),
 *    _size: number,
 *    _blob: (!Blob|undefined),
 *    _err: (string|undefined),
 *    _token: (string|undefined),
 *    _finished: (boolean|undefined),
 * }}
 */
var WorkerStepInfo;

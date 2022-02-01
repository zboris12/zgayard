//function showError(msg){}

/**
 * @typedef
 * {{
 *    _table: Element,
 *    _tbody: Element,
 * }}
 */
var TableBody;
/**
 * @typedef
 * {{
 *    _method: string,
 *    _headers: Object<string, string>,
 *    _doneFunc: function(number, string),
 * }}
 */
var AjaxOption;

/**
 * @typedef
 * {{
 *    _fpath: string,
 *    _file: File,
 * }}
 */
var UploadTarget;

/** @interface */
function ZBWriter(){
	/**
	 * @public
	 * @param {number} fsize
	 * @param {function()=} cb
	 */
	this.prepare = function(fsize, cb){};
	/**
	 * @public
	 * @param {ArrayBuffer|Array<number>} buf
	 * @param {function()=} cb
	 */
	this.write = function(buf, cb){};
	/**
	 * @public
	 * @param {function(?,?=)=} cb
	 */
	this.cancel = function(cb){};
}
/** @interface */
function ZBReader(){
	/** @public @type {?function(ArrayBuffer, *)} */
	this.onread;
	/**
	 * @public
	 * @param {number=} offset
	 * @param {function()=} cb
	 */
	this.prepare = function(offset, cb){};
	/**
	 * @public
	 * @return {number}
	 */
	this.getPos = function(){};
	/**
	 * @public
	 * @return {number}
	 */
	this.getSize = function(){};
	/**
	 * @public
	 * @return {boolean}
	 */
	this.isEnd = function(){};
	/**
	 * @public
	 * @param {number=} size
	 */
	this.read = function(size){};
	/**
	 * @public
	 */
	this.dispose = function(){};
}

/**
 * @typedef
 * {{
 *    _downEle: (HTMLLinkElement|undefined),
 * }}
 */
var ZBWriterOption;
/**
 * @typedef
 * {{
 *    _blob: Blob,
 *    _bufSize: (number|undefined),
 * }}
 */
var ZBReaderOption;

/**
 * @typedef
 * {{
 *    _decrypt: (boolean|undefined),
 *    _keycfg: (CipherParams|string),
 *    _reader: ZBReader,
 *    _writer: (ZBWriter|undefined),
 * }}
 */
var ZbCryptoOption;

/**
 * @typedef
 * {{
 *    _name: string,
 *    _newInstance: function(ZbLocalStorage, string, string=):ZBDrive,
 *    _isTarget: function(?Object<string, string>):boolean,
 * }}
 */
var DriveDefine;
/**
 * @typedef
 * {{
 *   _status: number,
 *   _restext: string,
 * }}
 */
var DriveJsonRet;
/**
 * @typedef
 * {{
 *    _method: (string|undefined),
 *    _headers: (Object<string, string>|undefined),
 *    _upath: string,
 *    _utype: (string|undefined),
 *    _utoken: (string|undefined),
 *    _auth: (string|undefined),
 *    _data: (ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined),
 *    _doneFunc: (function(DriveJsonRet)|undefined),
 *    _retry: (boolean|undefined),
 * }}
 */
var DriveAjaxOption;
/**
 * @typedef
 * {{
 *   _id: string,
 *   _name: string,
 *   _size: (number|undefined),
 *   _lastModifiedDateTime: (string|undefined),
 *   _parent: (string|undefined),
 *   _type: (string|undefined),
 * }}
 */
var DriveItem;
/**
 * @typedef
 * {{
 *   _trash: number,
 *   _total: number,
 *   _used: number,
 * }}
 */
var DriveInfo;
/**
 * @typedef
 * {{
 *    _utype: (string|undefined),
 *    _utoken: (string|undefined),
 *    _auth: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), DriveInfo=),
 * }}
 */
var DriveGetDriveOption;
/**
 * @typedef
 * {{
 *    _upath: (string|undefined),
 *    _uid: (string|undefined),
 *    _utype: (string|undefined),
 *    _utoken: (string|undefined),
 *    _auth: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), DriveItem=),
 * }}
 */
var DriveGetItemOption;
/**
 * @typedef
 * {{
 *    _ufolder: (string|undefined),
 *    _uid: (string|undefined),
 *    _utype: (string|undefined),
 *    _utoken: (string|undefined),
 *    _auth: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), Array<DriveItem>=),
 * }}
 */
var DriveListFolderOption;
/**
 * @typedef
 * {{
 *    _folder: (string|undefined),
 *    _parentfolder: (string|undefined),
 *    _parentid: (string|undefined),
 *    _utype: (string|undefined),
 *    _utoken: (string|undefined),
 *    _auth: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), DriveItem=),
 * }}
 */
var DriveNewFolderOption;
/**
 * @typedef
 * {{
 *    _fid: (string|undefined),
 *    _newname: (string|undefined),
 *    _parentid: (string|undefined),
 *    _utype: (string|undefined),
 *    _utoken: (string|undefined),
 *    _auth: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet)),
 * }}
 */
var DriveUpdateOption;

/**
 * @typedef
 * {{
 *    _auth: (string|undefined),
 *    _fldr: (string|undefined),
 *    _fldrId: (string|undefined),
 *    _fnm: string,
 * }}
 */
var DriveWriterOption;
/**
 * @typedef
 * {{
 *    _auth: (string|undefined),
 *    _bufSize: (number|undefined),
 *    _id: string,
 * }}
 */
var DriveReaderOption;

/**
 * @interface
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 * @param {string=} _relayUrl
 */
function ZBDrive(_storage, _authUrl, _relayUrl){
	/**
	 * @public
	 * @param {boolean=} reuseToken
	 * @return {boolean}
	 */
	this.login = function(reuseToken){};
	/**
	 * @public
	 */
	this.logout = function(){};
	/**
	 * @public
	 * @param {DriveGetDriveOption} opt
	 */
	this.getDrive = function(opt){};
	/**
	 * @public
	 * @param {DriveGetItemOption} opt
	 */
	this.getItem = function(opt){};
	/**
	 * @public
	 * @param {DriveListFolderOption} opt
	 */
	this.listFolder = function(opt){};
	/**
	 * @public
	 * @param {DriveNewFolderOption} opt
	 */
	this.newFolder = function(opt){};
	/**
	 * @public
	 * @param {DriveUpdateOption} opt
	 */
	this.rename = function(opt){};
	/**
	 * @public
	 * @param {DriveUpdateOption} opt
	 */
	this.move = function(opt){};
	/**
	 * @public
	 * @param {DriveUpdateOption} opt
	 */
	this.delete = function(opt){};
	/**
	 * @public
	 * @param {DriveWriterOption} opt
	 * @return {ZBWriter}
	 */
	this.createWriter = function(opt){};
	/**
	 * @public
	 * @param {DriveReaderOption} opt
	 * @return {ZBReader}
	 */
	this.createReader = function(opt){};
}

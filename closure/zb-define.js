/**
 * @typedef
 * {{
 *    _clientId: string,
 *    _clientSecret: string,
 * }}
 */
var DriveExtraInfo;
/**
 * @typedef
 * {{
 *    _tag: string,
 *    _name: string,
 *    _value: string,
 * }}
 */
var AttributeInfo;
/**
 * @typedef
 * {{
 *    _button: (Element|undefined),
 *    _menu: Element,
 * }}
 */
var MenuSwithInfo;
/**
 * @typedef
 * {{
 *    _id: number,
 *    _x: number,
 *    _y: number,
 * }}
 */
var TouchPosition;
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
 *    _fid: string,
 *    _folder: string,
 *    _time: string,
 * }}
 */
var PlayedInfo;

/**
 * @typedef
 * {{
 *    _fpath: string,
 *    _file: File,
 *    _idx: number,
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
 *    _reader: (ZBReader|function():ZBReader),
 *    _writer: (ZBWriter|undefined),
 * }}
 */
var ZbCryptoOption;

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
 *    _data: (ArrayBuffer|DataView|Blob|FormData|null|string|undefined),
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
 *   _parentId: (string|undefined),
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
 *    _doneFunc: (function((boolean|DriveJsonRet), *=)|undefined),
 * }}
 */
var DriveBaseOption;
// {
//   _utype: "Bearer",
//   _utoken: "xxxxxxxxxxxx",
//   _auth: "yyyyyyyyy", // If "auth" is specified then "utype" and "utoken" will be ignored.  
// }

/**
 * @typedef
 * {{
 *    _doneFunc: function((boolean|DriveJsonRet), DriveInfo=),
 * }}
 */
var DriveGetDriveOption;
/** @lends {DriveBaseOption} *///(DriveGetDriveOption);
/**
 * @typedef
 * {{
 *    _fname: (string|undefined),
 *    _parentid: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), Array<DriveItem>=),
 * }}
 */
var DriveSearchItemsOption;
/**
 * @typedef
 * {{
 *    _uid: string,
 *    _doneFunc: function((boolean|DriveJsonRet), DriveItem=),
 * }}
 */
var DriveGetItemOption;
/**
 * @typedef
 * {{
 *    _folder: string,
 *    _parentid: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), DriveItem=),
 * }}
 */
var DriveNewFolderOption;
/**
 * @typedef
 * {{
 *    _fid: string,
 *    _newname: (string|undefined),
 *    _parentid: (string|undefined),
 *    _oldparentid: (string|undefined),
 *    _doneFunc: function((boolean|DriveJsonRet), number=),
 * }}
 */
var DriveUpdateOption;

/**
 * @typedef
 * {{
 *    _auth: (string|undefined),
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

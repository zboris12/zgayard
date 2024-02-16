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
	 * @return {!Promise<void>}
	 */
	this.prepare = async function(fsize){};
	/**
	 * @public
	 * @param {ArrayBuffer|Array<number>} buf
	 * @return {!Promise<void>}
	 */
	this.write = async function(buf){};
	/**
	 * @public
	 * @return {!Promise<void>}
	 */
	this.cancel = async function(){};
}
/** @interface */
function ZBReader(){
	/**
	 * @public
	 * @param {number=} offset
	 * @return {!Promise<void>}
	 */
	this.prepare = async function(offset){};
	/**
	 * @public
	 * @return {number}
	 */
	this.getBufSize = function(){};
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
	 * @return {!Promise<ArrayBuffer>}
	 */
	this.read = async function(size){};
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
 *    _reader: (ZBReader),
 * }}
 */
var ZbCryptoReaderOption;

/**
 * @typedef
 * {{
 *    _decrypt: (boolean|undefined),
 *    _keycfg: (CipherParams|string),
 *    _reader: (ZBReader),
 *    _writer: (ZBWriter),
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
 *    _headers: (Headers|undefined),
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
 *    _fname: (string|undefined),
 *    _parentid: (string|undefined),
 * }}
 */
var DriveSearchItemsOption;
/**
 * @typedef
 * {{
 *    _uid: string,
 * }}
 */
var DriveGetItemOption;
/**
 * @typedef
 * {{
 *    _folder: string,
 *    _parentid: (string|undefined),
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

/**
 * @typedef
 * {{
 *    _drive: ZbDrive,
 *    _keycfg: CipherParams,
 *    _readers: Map<string, ZbCryptoReader>,
 * }}
 */
var SWCacheData;
/**
 * @typedef
 * {{
 *    _from: number,
 *    _to: number,
 * }}
 */
var FetchRange;

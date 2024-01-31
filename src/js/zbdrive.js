/** @type {Object<string, ZbDriveDefine>} */
var g_DRIVES = new Object();
/**
 * @constructor
 * @param {string} _id
 * @param {string} _name
 * @param {typeof ZbDrive} _drvtyp
 */
function ZbDriveDefine(_id, _name, _drvtyp){
	/** @private @type {string} */
	this._id = _id;
	/** @private @type {string} */
	this._name = _name;
	/** @private @type {typeof ZbDrive} */
	this._drvtyp = _drvtyp;
}
/**
 * @public
 * @return {string}
 */
ZbDriveDefine.prototype.getName = function(){
	return this._name;
};
/**
 * @public
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 * @return {ZbDrive}
 * @suppress {checkTypes}
 */
ZbDriveDefine.prototype.newDriveInstance = function(_storage, _authUrl){
	return new this._drvtyp(_storage, _authUrl);
};
/**
 * @public
 * @param {?Object<string, string>} uparams
 * @return {boolean}
 */
ZbDriveDefine.prototype.isTarget = function(uparams){
	if(uparams && uparams["state"] == this._id){
		return true;
	}else{
		return false;
	}
};

/**
 * @abstract
 * @constructor
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 */
function ZbDrive(_storage, _authUrl){
	/** @private @type {?string} */
	this.relayUrl = null;
	/** @private @type {string} */
	this.authUrl = _authUrl;
	/** @private @type {?string} */
	this.accessToken = null;
	/** @private @type {ZbLocalStorage} */
	this.storage = _storage;

	if(this.super){
		return;
	}
	/**
	 * A dummy function to prevent the warning JSC_INEXISTENT_PROPERTY by Closure Complier.
	 *
	 * @protected
	 * @param {ZbLocalStorage} _storage
	 * @param {string} _authUrl
	 */
	this.super = function(_storage, _authUrl){};
}

/** @const {string} */
ZbDrive.ITMTYP_FOLDER = "1";
/** @const {string} */
ZbDrive.ITMTYP_FILE = "2";

/**
 * @abstract
 * @public
 * @return {string}
 */
ZbDrive.prototype.getId = function(){};

/**
 * @public
 * @return {string}
 */
ZbDrive.prototype.getRelayUrl = function(){
	if(this.relayUrl == null){
		this.relayUrl = this.storage.getRelayUrl();
	}
	return this.relayUrl;
};
/**
 * @public
 * @param {string} rurl
 */
ZbDrive.prototype.setRelayUrl = function(rurl){
	this.relayUrl = rurl;
};

/**
 * @public
 * @param {DriveAjaxOption} opt
 * @return {!Promise<Response>}
 *
 * https://docs.microsoft.com/zh-cn/onedrive/developer/rest-api/api/driveitem_createuploadsession
 *  opt: {
 *    (required)_upath: "/me/drive",
 *    (optional)_method: "PUT",
 *    (optional)_utype: "Bearer",
 *    (optional)_utoken: "xxxxxxxx",
 *    (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *    (optional)_headers: {"Content-Type": "text/html"},
 *    (optional)_data: Object,
 *    (optional)_retry: false, // Is retry after InvalidAuthenticationToken or not.
 *  }
 */
ZbDrive.prototype.sendAjax = async function(opt){
	/** @type {string} */
	var method = "POST";
	/** @type {string} */
	var url = this.getAjaxBaseUrl().concat(encodeURI(opt._upath));
	/** @type {Headers} */
	var headers = new Headers();
	if(opt && opt._auth){
		headers.append("Authorization", opt._auth);
	}else if(opt && opt._utoken){
		/** @type {string} */
		var utype = "Bearer";
		if(opt && opt._utype){
			utype = opt._utype;
		}
		headers.append("Authorization", utype+" "+opt._utoken);
	}else{
		headers.append("Authorization", /** @type {string} */(this.accessToken));
	}
	if(opt && opt._headers){
		for(var pair of opt._headers.entries()){
			headers.append(pair[0], pair[1]);
		}
	}
	if(opt && opt._method){
		method = opt._method;
	}

	/** @type {Response} */
	var resp = await fetch(url, {
		"method": method,
		"body": opt._data,
		"headers": headers,
	});
	if(resp.status == 401 && this.storage.isSkipLogin() && !opt._retry){
		resp = await this.retryAjaxWithLogin(opt);
	}
	return resp;
};

/**
 * @public
 * @param {string} token
 */
ZbDrive.prototype.presetToken = function(token){
	this.accessToken = token;
};
/**
 * @public
 * @return {string}
 */
ZbDrive.prototype.getToken = function(){
	if(this.accessToken){
		return this.accessToken;
	}else{
		return "";
	}
};
/**
 * @public
 * @param {boolean=} reuseToken
 * @return {!Promise<string?>}
 */
ZbDrive.prototype.login = async function(reuseToken){
	if(reuseToken){
		this.accessToken = this.storage.getSessionData("access_token");
		if(this.accessToken){
			return null;
		}
	}

	/** @type {boolean} */
	var canSkipLogin = this.storage.isSkipLogin();
	/** @type {Object} */
	var opt = new Object();
	/** @type {Object<string, string>} */
	var uparams  = getQueryParameters();
	if(uparams && uparams["token_type"] && uparams["access_token"]){
		this.setAccessToken(uparams["token_type"], uparams["access_token"]);
		if(uparams && uparams["state"]){
			if(this.storage.checkSessionData("login_state", uparams["state"])){
				this.storage.removeSessionData("login_state");
			}else{
				return "Unauthorized access to this url.";
			}
		}
		return null;
	}else if(uparams && uparams["code"]){
		opt.code = uparams["code"];
	}else if(canSkipLogin){
		opt.refreshToken = this.storage.getDriveData("refresh_token");
	}

	/** @type {?DriveExtraInfo} */
	var dext = this.storage.getDriveExInfo();
	if(dext){
		opt.clientId = dext._clientId;
		opt.clientSecret = dext._clientSecret;
	}

	var authObj = null;
	if(opt.code || opt.refreshToken){
		if(uparams && uparams["state"]){
			if(this.storage.checkSessionData("login_state", uparams["state"])){
				this.storage.removeSessionData("login_state");
			}else{
				return "Unauthorized access to this url.";
			}
		}
		authObj = await this.authorize(opt);
		if(authObj && authObj["token_type"] && authObj["access_token"]){
			if(dext && authObj["client_secret_enc"]){
				dext._clientSecret = authObj["client_secret_enc"];
				this.storage.setDriveExInfo(dext);
			}
			this.setAccessToken(authObj["token_type"], authObj["access_token"]);
			if(canSkipLogin && opt.code && authObj["refresh_token"]){
				this.storage.saveDriveData("refresh_token", authObj["refresh_token"]);
			}
			if(authObj["logout"]){
				this.storage.setSessionData("logout_url", authObj["logout"]);
			}
			return null;
		}else if(authObj && authObj["error"]){
			return "["+authObj["error"]+"] "+authObj["error_description"];
		}else{
			return "Unknown error occured when doing authorization.";
		}
	}else{
		if(canSkipLogin){
			opt.needCode = true;
		}
		authObj = await this.authorize(opt);
		if(authObj && authObj["url"]){
			if(dext && authObj["client_secret_enc"]){
				dext._clientSecret = authObj["client_secret_enc"];
				this.storage.setDriveExInfo(dext);
			}
			if(authObj["state"]){
				if(!this.storage.setSessionData("login_state", authObj["state"])){
					authObj["state"] = this.getId();
				}
			}
			if(authObj["logout"]){
				this.storage.setSessionData("logout_url", authObj["logout"]);
			}
			window.location.href = authObj["url"].concat("&state=".concat(encodeURIComponent(authObj["state"])));
			return "redirect";
		}else if(authObj && authObj["error"]){
			return "["+authObj["error"]+"] "+authObj["error_description"];
		}else{
			return "Unknown error occured when doing authorization.";
		}
	}
};
/**
 * @public
 */
ZbDrive.prototype.logout = function(){
	this.accessToken = null;
	this.storage.removeSessionData("access_token");
	var lourl = /** @type {string} */(this.storage.getSessionData("logout_url"));
	if(lourl){
		window.location.href = lourl;
		return;
	}

	/** @type {FormData} */
	var formData = new FormData();
	formData.append("drive_type", this.getId());
	formData.append("action", "logout");

	/** @type {XMLHttpRequest} */
	var ajax = new XMLHttpRequest();
	ajax.open("POST", this.authUrl, true);
	ajax.withCredentials = true;
	ajax.onload = function(a_evt){
		/** @type {XMLHttpRequest} */
		var a_x = a_evt.target;
		if (a_x.readyState == 4){
			if(a_x.status == 200){
				var ret = JSON.parse(a_x.responseText);
				if(ret && ret["logout"]){
					window.location.href = ret["logout"];
				}
			}
		}
	};
	ajax.send(formData);
};

/**
 * @abstract
 * @public
 * @param {DriveBaseOption} opt
 * @return {!Promise<DriveInfo>}
 */
ZbDrive.prototype.getDrive = async function(opt){};
/**
 * @abstract
 * @public
 * @param {DriveSearchItemsOption} opt
 * @return {!Promise<Array<DriveItem>>}
 *
 * opt: {
 *   (required)_fname: "aaa.txt",
 *   (optional)_parentid: "xxxxxx",
 * }
 */
ZbDrive.prototype.searchItems = async function(opt){};
/**
 * @abstract
 * @public
 * @param {DriveGetItemOption} opt
 * @return {!Promise<DriveItem>}
 *
 * opt: {
 *   (required)_uid: "xxxxxx",
 * }
 */
ZbDrive.prototype.getItem = async function(opt){};
/**
 * @abstract
 * @public
 * @param {DriveNewFolderOption} opt
 * @return {!Promise<DriveItem>}
 *
 * opt: {
 *   (required)_folder: "zzzz",
 *   (optional)_parentid: "xxxxxx",
 * }
 */
ZbDrive.prototype.newFolder = async function(opt){};

/**
 * @public
 * @param {DriveUpdateOption} opt
 * @return {!Promise<number>}
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_newname: "xxx.yyy",
 * }
 */
ZbDrive.prototype.rename = async function(opt){
	if(!(opt && opt._newname)){
		throw new Error("newname is not specified.");
	}
	return await this.updateProp(opt);
};
/**
 * @public
 * @param {DriveUpdateOption} opt
 * @return {!Promise<number>}
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_parentid: "xxxxxx",
 *   (required)_oldparentid: "yyyyyy",
 * }
 */
ZbDrive.prototype.move = async function(opt){
	if(!(opt && opt._parentid)){
		throw new Error("parentid is not specified.");
	}
	if(!(opt && opt._oldparentid)){
		throw new Error("oldparentid is not specified.");
	}
	return await this.updateProp(opt);
};

/**
 * @abstract
 * @public
 * @param {DriveUpdateOption} opt
 * @return {!Promise<number>}
 *
 * opt: {
 *   (required)_fid: "zzzz",
 * }
 */
ZbDrive.prototype.delete = async function(opt){};

/**
 * @abstract
 * @public
 * @param {DriveWriterOption} opt
 * @param {number} upSize
 * @return {!Promise<string>}
 *
 * opt = {
 *   _auth: "xxxxxxxxx",   // optional
 *   _fldrId: "xxxxxx",    // optional
 *   _fnm: "aaa.txt",      // required
 * }
 */
ZbDrive.prototype.prepareWriter = async function(opt, upSize){};

/**
 * @abstract
 * @public
 * @param {XMLHttpRequest} ajax
 * @return {number} Next write postion.
 *
 * If return value is ZbDrvWrtPos.FINISHED, it means write is finished.
 * If return value is ZbDrvWrtPos.ERROR, it means response status is invalid.
 * If return value is ZbDrvWrtPos.UNKNOWN, it means unknown next position.
 */
ZbDrive.prototype.getNextPosition = function(ajax){};

/**
 * @public
 * @param {string} upurl
 * @param {function((boolean|DriveJsonRet), DriveJsonRet=)=} cb
 */
ZbDrive.prototype.cancelUpload = function(upurl, cb){
	if(cb){
		cb(false);
	}
};

/**
 * @public
 * @param {DriveWriterOption} opt
 * @return {ZbDriveWriter}
 */
ZbDrive.prototype.createWriter = function(opt){
	return new ZbDriveWriter(opt, this);
};

/**
 * @abstract
 * @public
 * @param {DriveReaderOption} opt
 * @param {function(?DriveItem, DriveJsonRet)} func Please set download url to _id of DriveItem
 *
 * _opt = {
 *   _auth: "xxxxxxxxx", // optional
 *   _id: "xxxxx",       // required
 *   _bufSize: 999,      // optional
 * }
 */
ZbDrive.prototype.prepareReader = function(opt, func){};

/**
 * @public
 * @param {Headers} headers
 * @param {string=} auth
 */
ZbDrive.prototype.setReadReqHeader = function(headers, auth){
	//Defaut to do nothing
};

/**
 * @public
 * @param {DriveReaderOption} opt
 * @return {ZbDriveReader}
 */
ZbDrive.prototype.createReader = function(opt){
	return new ZbDriveReader(opt, this);
};

/**
 * @protected
 * @return {boolean}
 */
ZbDrive.prototype.isSkipLogin = function(){
	return this.storage.isSkipLogin();
};

/**
 * @protected
 * @param {Response} resp
 * @return {!Promise<DriveJsonRet>}
 */
ZbDrive.prototype.getAjaxJsonRet = async function(resp){
	return {
		_status: resp.status,
		_restext: await resp.text(),
	};
};

/**
 * @protected
 * @param {string} upath
 * @param {string} md Method
 * @param {number} okcd The ok status code. 0 means don't check status code
 * @param {DriveBaseOption} opt
 * @param {Headers} hds
 * @param {ArrayBuffer|DataView|Blob|FormData|null|string|undefined} dat
 * @return {!Promise<DriveJsonRet>}
 */
ZbDrive.prototype._processRequest = async function(upath, md, okcd, opt, hds, dat){
	/** @type {DriveAjaxOption} */
	var opt2 = {
		_upath: upath,
		_method: md,
	};
	this.copyAuth(opt, opt2);
	if(hds){
		opt2._headers = hds;
	}
	if(dat){
		opt2._data = dat;
	}
	/** @type {Response} */
	var resp = await this.sendAjax(opt2);
	/** @type {DriveJsonRet} */
	var rdat = await this.getAjaxJsonRet(resp);
	if(okcd && resp.status != okcd){
		throw new Error(JSON.stringify(rdat));
	}
	return rdat;
};
/**
 * @protected
 * @param {string} upath
 * @param {DriveBaseOption} opt
 * @return {!Promise<string>}
 */
ZbDrive.prototype._getData = async function(upath, opt){
	/** @type {DriveJsonRet} */
	var res = await this._processRequest(upath, "GET", 200, opt, null, null);
	return res._restext;
};
/**
 * @protected
 * @param {Object<string, *>} opt
 * @param {Object<string, *>} opt2
 */
ZbDrive.prototype.copyAuth = function(opt, opt2){
	if(opt._utype){
		opt2._utype = opt._utype;
	}
	if(opt._utoken){
		opt2._utoken = opt._utoken;
	}
	if(opt._auth){
		opt2._auth = opt._auth;
	}
};

/**
 * @abstract
 * @protected
 * @return {string}
 */
ZbDrive.prototype.getAjaxBaseUrl = function(){};

/**
 * @abstract
 * @protected
 * @param {DriveUpdateOption} opt
 * @return {!Promise<number>}
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (optional)_parentid: "xxxxxx",    // for move
 *   (optional)_oldparentid: "yyyyyy", // for move
 *   (optional)_newname: "zzzzzz",     // for rename
 * }
 */
ZbDrive.prototype.updateProp = async function(opt){};

/**
 * @private
 * @param {string} type
 * @param {string} token
 */
ZbDrive.prototype.setAccessToken = function(type, token){
	this.accessToken = type + " " + token;
	this.storage.setSessionData("access_token", this.accessToken);
};
/**
 * @private
 * @param {Object<string, (string)>} opt
 * @return {Promise<*>}
 *
 * opt: {
 *   (optional)clientId: "xxxxx",
 *   (optional)redirectUri: "https://xxxxx",
 *   (optional)clientSecret: "xxxxx",
 *   (optional)code: "xxxxx",
 *   (optional)refreshToken: "xxxxx",
 *   (optional)needCode: true,
 * }
 */
ZbDrive.prototype.authorize = async function(opt){
	if(!opt){
		throw new Error("Options are not specified when auth onedrive.");
	}

	/** @type {FormData} */
	var formData = new FormData();
	formData.append("drive_type", this.getId());
	if(opt.clientId){
		formData.append("client_id", opt.clientId);
	}
	if(opt.redirectUri){
		formData.append("redirect_uri", opt.redirectUri);
	}
	if(opt.clientSecret){
		formData.append("client_secret", opt.clientSecret);
	}
	if(opt.code){
		formData.append("code", opt.code);
	}else if(opt.refreshToken){
		formData.append("refresh_token", opt.refreshToken);
	}else{
		if(opt.needCode){
			formData.append("need_code", opt.needCode);
		}
//		throw new Error("Code or refresh token must be specified when auth onedrive.");
	}

	/** @type {Response} */
	var resp = await fetch(this.authUrl, {
		"method": "POST",
		"body": formData,
		"credentials": "include",
	});
	if(resp.status == 200){
		var respObj = await resp.json();
		return respObj;
	}else{
		/** @type {string} */
		var resptext = await resp.text();
		throw new Error(resptext+" ("+resp.status+")");
	}
};
/**
 * @private
 * @param {DriveAjaxOption} _opt
 * @return {!Promise<Response>}
 */
ZbDrive.prototype.retryAjaxWithLogin = async function(_opt){
	console.log("Retry to send ajax.");
	if(_opt){
		_opt._retry = true;
	}else{
		return null;
	}
	/** @type {string?} */
	var errmsg = await this.login();
	if(errmsg){
		console.error(errmsg);
		return null;
	}else{
		_opt._auth = /** @type {string} */(this.accessToken);
		return await this.sendAjax(_opt);
	}
};

/**
 * @param {Function} drvCtr
 */
ZbDrive.inherit = function(drvCtr){
	drvCtr.super_ = ZbDrive;
	if(typeof Object.create === "function"){
		drvCtr.prototype = Object.create(ZbDrive.prototype, {
			constructor: {
				value: drvCtr,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	}else{
		// old school shim for old browsers
		/**
		 * @constructor
		 */
		var tempCtr = function(){};
		tempCtr.prototype = ZbDrive.prototype;
		drvCtr.prototype = new tempCtr();
		drvCtr.prototype.constructor = drvCtr;
	}

	if(!drvCtr.prototype.getSuperClass){
		drvCtr.prototype.getSuperClass = function(){
			return this.constructor.super_;
		};
	}
	if(!drvCtr.prototype.super){
		drvCtr.prototype.super = function(...args){
			return this.constructor.super_.call(this, ...args);
		};
	}
	if(!drvCtr.prototype.superCall){
		drvCtr.prototype.superCall = function(funcnm, ...args){
			if(funcnm){
				return this.constructor.super_.prototype[funcnm].call(this, ...args);
			}else{
				return this.constructor.super_.call(this, ...args);
			}
		};
	}
};
/**
 * @param {string} _id
 * @param {string} _name
 * @param {typeof ZbDrive} _drvtyp
 */
ZbDrive.addDefine = function(_id, _name, _drvtyp){
	ZbDrive.inherit(_drvtyp);
	g_DRIVES[_id] = new ZbDriveDefine(_id, _name, _drvtyp);
};

/**
 * @enum {number}
 */
const ZbDrvWrtPos = {
	FINISHED: -1,  
	ERROR: -9,
	UNKNOWN: 0,
};

/**
 * @constructor
 * @implements {ZBWriter}
 * @param {DriveWriterOption} _opt
 * @param {ZbDrive} _drv
 *
 * _opt = {
 *   _auth: "xxxxxxxxx",   // optional
 *   _fldr: "a/b",         // optional
 *   _fldrId: "xxxxxx",    // optional
 *   _fnm: "aaa.txt",      // required
 * }
 */
function ZbDriveWriter(_opt, _drv){
	/** @private @type {ZbDrive} */
	this.drive = _drv;
	/** @private @type {DriveWriterOption} */
	this.opt = _opt;
	/** @private @type {string} */
	this.upUrl = "";
	/** @private @type {number} */
	this.upSize = 0;
	/** @private @type {number} */
	this.pos = 0;
	/** @private @type {ArrayBuffer|Array<number>} */
	this.rebuf = null; // remained buffer

	if(!(this.opt && this.opt._fnm)){
		throw new Error("fnm is not specified.");
	}

	/**
	 * @public
	 * @param {number} fsize
	 * @return {!Promise<void>}
	 */
	this.prepare = async function(fsize){
		this.upSize = fsize;
		this.upUrl = await this.drive.prepareWriter(this.opt, fsize);
	};

	/**
	 * @public
	 * @param {ArrayBuffer|Array<number>} buf
	 * @param {function(string)=} cb
	 */
	this.write = function(buf, cb){
		/** @type {Uint8Array} */
		var whole = null;
		if(this.rebuf){
			if(this.rebuf instanceof ArrayBuffer){
				/** @type {number} */
				var buflen = this.rebuf.byteLength;
				if(buflen > 0){
					whole = new Uint8Array(buflen + buf.byteLength);
					whole.set(new Uint8Array(this.rebuf), 0);
					whole.set(new Uint8Array(buf), buflen);
				}else{
					whole = new Uint8Array(buf);
				}
			}else if(this.rebuf.length > 0){
				whole = new Uint8Array(this.rebuf.concat(buf));
			}else{
				whole = new Uint8Array(buf);
			}
			this.rebuf = null;
		}else{
			whole = new Uint8Array(buf);
		}

		/** @type {Blob} */
		var bufblob = new Blob([whole], { "type" : "application/octet-binary" });
		/** @type {string} */
		var range = "bytes " + this.pos + "-";
		this.pos += bufblob.size;
		range += (this.pos - 1) + "/" + this.upSize;

		/** @type {number} */
		var retryCnt = 0;
		/** @type {function()} */
		var ajaxPut = function(){
			/** @type {XMLHttpRequest} */
			var ajax = new XMLHttpRequest();
			ajax.open("PUT", this.upUrl, true); //非同期
//			ajax.setRequestHeader("Content-Length", bufblob.size);
			ajax.setRequestHeader("Content-Range", range);
			ajax.onload = function(a_evt){
				bufblob = null;
				/** @type {XMLHttpRequest} */
				var a_x = a_evt.target;
				if(a_x.readyState == 4){
					/** @type {number} */
					var a_npos = this.drive.getNextPosition(a_x);
					if(a_npos == ZbDrvWrtPos.ERROR){
						buf = null;
						throw new Error(a_x.responseText+" ("+a_x.status+")");
					}else if(a_npos != ZbDrvWrtPos.FINISHED && a_npos != ZbDrvWrtPos.UNKNOWN && a_npos < this.pos){
						/** @type {number} */
						var a_buflen = 0;
						if(buf instanceof ArrayBuffer){
							a_buflen = buf.byteLength;
						}else{
							a_buflen = buf.length;
						}
						a_buflen -= this.pos - a_npos;
						if(a_buflen > 0){
							/** @type {ArrayBuffer|Array<number>} */
							var a_buf = buf.slice(a_buflen);
							buf = null;
							if(this.pos >= this.upSize){
								this.write(a_buf, cb);
								return;
							}else{
								this.rebuf = a_buf;
								this.pos = a_npos;
							}
						}else{
							buf = null;
							throw new Error("Can NOT continue to upload buffer.");
						}
					}
					if(cb){
						cb(a_x.responseText);
					}
				}
			}.bind(this);
			ajax.onerror = function(a_evt){
				if(retryCnt < 1){
					retryCnt++;
					// retry for occasionally server failed
					setTimeout(function(){
						ajaxPut();
					}, 500);
				}else{
					buf = null;
					bufblob = null;
				}
			};
			ajax.send(bufblob);
		}.bind(this);
		ajaxPut();
	};
	/**
	 * @public
	 * @param {function((boolean|DriveJsonRet), DriveJsonRet=)=} cb
	 *
	 * cb: function(a_err, a_result){}
	 * a_result: {_status: 999, _restext: "xxxxx"}
	 */
	this.cancel = function(cb){
		this.drive.cancelUpload(this.upUrl, cb);
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getTotalSize = function(){
		return this.upSize;
	};
}

/**
 * @constructor
 * @implements {ZBReader}
 * @param {DriveReaderOption} _opt
 * @param {ZbDrive} _drv
 *
 * _opt = {
 *   _auth: "xxxxxxxxx", // optional
 *   _id: "xxxxx",       // required
 *   _bufSize: 999,      // optional
 * }
 */
function ZbDriveReader(_opt, _drv){
	/** @private @type {ZbDrive} */
	this.drive = _drv;
	/** @private @type {DriveReaderOption} */
	this.opt = _opt;
	/** @private @type {string} */
	this.url = "";
	/** @private @type {?string} */
	this.name = null;
	/** @private @type {number} */
	this.size = 0;
	/** @private @type {number} */
	this.pos = 0;
	/** @private @type {number} */
	this.reading = 0;
	/** @private @type {number} */
	this.oldreading = 0;
	/** @private @type {boolean} */
	this.prepared = false;
	/**
	 * @private @type {number}
	 *
	 * buffer size per read
	 */
	this.bufSize = 16000;
	if(_opt._bufSize){
		this.bufSize = _opt._bufSize;
	}
	/** @private @type {number} */
	this.tryLevel = 0;
	/** @private @type {number} */
	this.retryAuth = 0;  //0 Can't retry, 1 Can retry, 2 Retryed

	/** @public @type {?function(ArrayBuffer, *)} */
	this.onread = null;
	/**
	 * @public
	 * @param {number=} offset
	 * @param {function()=} cb
	 */
	this.prepare = function(offset, cb){
		if(this.prepared){
			if(this.reading){
				this.oldreading = this.reading;
				this.reading = 0;
			}
			if(offset){
				if(offset >= this.getSize()){
					console.log("offset:"+offset+",size:"+this.getSize());
					throw new Error("offset can not be bigger than input size.");
				}else{
					this.pos = offset;
				}
			}else{
				this.pos = 0;
			}
			if(cb){
				cb();
			}
			return;
		}

		this.drive.prepareReader(this.opt, function(a_dat, a_res){
			this.prepared = true;
			if(a_dat){
				this.size = a_dat._size;
				this.url = a_dat._id;
				this.name = a_dat._name;
				if(a_dat._type == "1"){
					this.retryAuth = 1;
				}else{
					this.retryAuth = 0;
				}
				if(offset){
					if(offset >= this.getSize()){
						throw new Error("offset can not be bigger than input size.");
					}else{
						this.pos = offset;
					}
				}
				if(cb){
					cb();
				}

			}else{
				throw new Error(a_res._restext+" ("+a_res._status+")");
			}
		}.bind(this));
	};
	/**
	 * @public
	 * @return {?string}
	 */
	this.getName = function(){
		return this.name;
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getPos = function(){
		return this.pos;
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getSize = function(){
		return this.size;
	};
	/**
	 * @public
	 * @return {boolean}
	 */
	this.isEnd = function(){
		return this.pos >= this.getSize();
	};
	/**
	 * @public
	 * @param {number=} size
	 */
	this.read = function(size){
		if(!size){
			size = this.bufSize;
		}
		this._read(size);
	};
	/**
	 * @public
	 */
	this.dispose = function(){
		// Do nothing
	};

	/**
	 * @private
	 * @param {number=} size
	 */
	this._read = function(size){
		if(size && this.reading){
			return;
		}else if(size){
			this.reading = size;
		}else if(this.reading){
			size = this.reading;
		}else{
			throw new Error("size must be specified.");
		}
		if(this.oldreading){
			return;
		}
		/** @type {number} */
		var pos1 = this.pos + size - 1;

		/** @type {function()} */
		var ajaxGet = async function(){
			/** @type {string} */
			var url = this.url;
			/** @type {Headers} */
			var headers = new Headers();
			if(this.tryLevel >= 10){
				url = this.drive.getRelayUrl();
				headers.append("Zb-Url", this.url);
			}
			this.drive.setReadReqHeader(headers, this.opt._auth);
//			if(this.pos > 0 || pos1 < this.size - 1){
				headers.append("Range", "bytes="+this.pos+"-"+pos1);
//			}

			try{
				/** @type {Response} */
				var resp = await fetch(url, {
					"method": "GET",
					"headers": headers,
				});
				if(this.oldreading){
					this.oldreading = 0;
					if(this.reading){
						this._read();
					}
					return;
				}
				this.reading = 0;

				if(this.tryLevel < 10){
					this.tryLevel = 1;
				}else{
					this.tryLevel =11;
				}
				if(resp.status == 200 || resp.status == 206){
					if(this.retryAuth == 2){
						this.retryAuth = 1;
					}
					/** @type {number} */
					var a_l = parseInt(resp.headers.get("content-length"), 10);
					if(a_l){
						this.pos += a_l;
					}else{
						/** @type {number} */
						var a_r = analyzeRangePos(resp.headers.get("content-range"));
						if(a_r){
							this.pos = a_r + 1;
						}else{
							this.pos = pos1 + 1;
						}
					}
					if(resp.status == 200 && this.pos < this.getSize()){
						this.pos = this.getSize();
					}else if(this.pos > this.getSize()){
						this.pos = this.getSize();
					}
					if(this.onread){
						/** @type {ArrayBuffer} */
						var buf = await resp.arrayBuffer();
						this.onread(buf, this);
					}
				}else if(resp.status == 401 && this.retryAuth == 1){
					console.log("Retry auth.");
					this.retryAuth = 2;
					/** @type {string?} */
					var errmsg = await this.drive.login();
					if(errmsg){
						console.error(errmsg);
					}else{
						if(this.opt._auth){
							delete this.opt._auth;
						}
						await ajaxGet();
					}
				}else{
					/** @type {string} */
					var resptext = await resp.text();
					throw new Error(resptext+" ("+resp.status+")");
				}
			}catch(err){
				if(this.tryLevel == 0 && this.drive.getRelayUrl()){
					this.tryLevel = 10;
					await ajaxGet();
				}else if(this.tryLevel == 1 || this.tryLevel == 11){
					this.tryLevel++;
					// retry for occasionally server failed
					setTimeout(function(){
						ajaxGet().then();
					}, 500);
				}
			}

		}.bind(this);

		ajaxGet().then();
	};
}

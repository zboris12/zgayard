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
 * @param {string=} _relayUrl
 * @return {ZbDrive}
 * @suppress {checkTypes}
 */
ZbDriveDefine.prototype.newDriveInstance = function(_storage, _authUrl, _relayUrl){
	return new this._drvtyp(_storage, _authUrl, _relayUrl);
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
 * @param {string=} _relayUrl
 */
function ZbDrive(_storage, _authUrl, _relayUrl){
	/** @public @type {string|undefined} */
	this.relayUrl = _relayUrl;

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
	 * @param {string=} _relayUrl
	 */
	this.super = function(_storage, _authUrl, _relayUrl){};
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
 * @param {DriveAjaxOption} opt
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
 *    (optional)_doneFunc: function(result){},
 *    (optional)_retry: false, // Is retry after InvalidAuthenticationToken or not.
 *  }
 */
ZbDrive.prototype.sendAjax = function(opt){
	/** @type {string} */
	var method = "POST";
	/** @type {string} */
	var url = this.getAjaxBaseUrl().concat(encodeURI(opt._upath));
	/** @type {XMLHttpRequest} */
	var ajax = new XMLHttpRequest();

 	if(opt && opt._method){
		method = opt._method;
	}
	ajax.open(method, url, true); //非同期
	if(opt && opt._auth){
		ajax.setRequestHeader("Authorization", opt._auth);
	}else if(opt && opt._utoken){
		/** @type {string} */
		var utype = "Bearer";
		if(opt && opt._utype){
			utype = opt._utype;
		}
		ajax.setRequestHeader("Authorization", utype+" "+opt._utoken);
	}else{
		ajax.setRequestHeader("Authorization", /** @type {string} */(this.accessToken));
	}
	if(opt && opt._headers){
		for(var key in opt._headers){
			ajax.setRequestHeader(key, opt._headers[key]);
		}
	}
	if(opt && opt._doneFunc){
		ajax.onload = function(a_evt){
			/** @type {XMLHttpRequest} */
			var a_x = a_evt.target;
			if (a_x.readyState == 4){
				if(a_x.status == 401 && this.storage.isSkipLogin() && !opt._retry){
					this.retryAjaxWithLogin(opt);
				}else{
					opt._doneFunc(a_x);
				}
			}
		}.bind(this);
	}
	ajax.send(opt._data);
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
 * @return {?string} Error message
 */
ZbDrive.prototype.login = function(reuseToken){
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

	if(opt.code || opt.refreshToken){
		if(uparams && uparams["state"]){
			if(this.storage.checkSessionData("login_state", uparams["state"])){
				this.storage.removeSessionData("login_state");
			}else{
				return "Unauthorized access to this url.";
			}
		}
		var ret = this.authorize(opt);
		if(ret && ret["token_type"] && ret["access_token"]){
			this.setAccessToken(ret["token_type"], ret["access_token"]);
			if(canSkipLogin && opt.code && ret["refresh_token"]){
				this.storage.saveDriveData("refresh_token", ret["refresh_token"]);
			}
			if(ret["logout"]){
				this.storage.setSessionData("logout_url", ret["logout"]);
			}
		}else if(ret && ret["error"]){
			return "["+ret["error"]+"] "+ret["error_description"];
		}else{
			return "Unknown error occured when doing authorization.";
		}
	}else{
		if(canSkipLogin){
			opt.needCode = true;
		}
		var ret = this.authorize(opt);
		if(ret && ret["url"]){
			if(ret["state"]){
				if(!this.storage.setSessionData("login_state", ret["state"])){
					ret["state"] = this.getId();
				}
			}
			if(ret["logout"]){
				this.storage.setSessionData("logout_url", ret["logout"]);
			}
			window.location.href = ret["url"].concat("&state=".concat(encodeURIComponent(ret["state"])));
			return "Need signin.";
		}else if(ret && ret["error"]){
			return "["+ret["error"]+"] "+ret["error_description"];
		}else{
			return "Unknown error occured when doing authorization.";
		}
	}
	return null;
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
 * @param {DriveGetDriveOption} opt
 *
 * opt: {
 *   (required)_doneFunc: function(error, data){},
 * }
 */
ZbDrive.prototype.getDrive = function(opt){};
/**
 * @abstract
 * @public
 * @param {DriveSearchItemsOption} opt
 *
 * opt: {
 *   (required)_fname: "aaa.txt",
 *   (optional)_parentid: "xxxxxx",
 *   (required)_doneFunc: function(error, datas){},
 * }
 */
ZbDrive.prototype.searchItems = function(opt){};
/**
 * @abstract
 * @public
 * @param {DriveGetItemOption} opt
 *
 * opt: {
 *   (required)_uid: "xxxxxx",
 *   (required)_doneFunc: function(error, data){},
 * }
 */
ZbDrive.prototype.getItem = function(opt){};
/**
 * @abstract
 * @public
 * @param {DriveNewFolderOption} opt
 *
 * opt: {
 *   (required)_folder: "zzzz",
 *   (optional)_parentid: "xxxxxx",
 *   (required)_doneFunc: function(error, folder){},
 * }
 */
ZbDrive.prototype.newFolder = function(opt){};

/**
 * @public
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_newname: "xxx.yyy",
 *   (required)_doneFunc: function(error){},
 * }
 */
ZbDrive.prototype.rename = function(opt){
	if(!(opt && opt._newname)){
		throw new Error("newname is not specified.");
	}
	this.updateProp(opt);
};
/**
 * @public
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_parentid: "xxxxxx",
 *   (required)_oldparentid: "yyyyyy",
 *   (required)_doneFunc: function(error){},
 * }
 */
ZbDrive.prototype.move = function(opt){
	if(!(opt && opt._parentid)){
		throw new Error("parentid is not specified.");
	}
	if(!(opt && opt._oldparentid)){
		throw new Error("oldparentid is not specified.");
	}
	this.updateProp(opt);
};

/**
 * @abstract
 * @public
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (optional)_doneFunc: function(error){},
 * }
 */
ZbDrive.prototype.delete = function(opt){};

/**
 * @abstract
 * @public
 * @param {DriveWriterOption} opt
 * @param {number} upSize
 * @param {function(string, DriveJsonRet)} func
 *
 * opt = {
 *   _auth: "xxxxxxxxx",   // optional
 *   _fldrId: "xxxxxx",    // optional
 *   _fnm: "aaa.txt",      // required
 * }
 *
 * func = function(a_url, a_res){};
 */
ZbDrive.prototype.prepareWriter = function(opt, upSize, func){};

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
 * @param {XMLHttpRequest} ajax
 * @return {DriveJsonRet}
 */
ZbDrive.prototype.getAjaxJsonRet = function(ajax){
	return {
		_status: ajax.status, 
		_restext: ajax.responseText,
	};
};

/**
 * @protected
 * @param {string} upath
 * @param {string} md Method
 * @param {number} okcd The ok status code. 0 means don't check status code
 * @param {DriveBaseOption} opt
 * @param {?Object<string, string>} hds
 * @param {ArrayBuffer|ArrayBufferView|Blob|Document|FormData|null|string|undefined} dat
 * @param {function(DriveJsonRet)} func
 */
ZbDrive.prototype._processRequest = function(upath, md, okcd, opt, hds, dat, func){
	/** @type {DriveAjaxOption} */
	var opt2 = {
		_upath: upath,
		_method: md,
		_doneFunc: function(a_ajax){
			/** @type {DriveJsonRet} */
			var a_dat = this.getAjaxJsonRet(a_ajax);
			/** @type {boolean} */
			var a_err = false;
			if(okcd && a_ajax.status != okcd){
				a_err = true;
			}
			if(a_err){
				if(opt && opt._doneFunc){
					opt._doneFunc(a_dat);
				}else{
					throw new Error(JSON.stringify(a_dat));
				}
			}else{
				func(a_dat);
			}
		}.bind(this),
	};
	this.copyAuth(opt, opt2);
	if(hds){
		opt2._headers = hds;
	}
	if(dat){
		opt2._data = dat;
	}
	this.sendAjax(opt2);
};
/**
 * @protected
 * @param {string} upath
 * @param {DriveBaseOption} opt
 * @param {function(string)} func
 */
ZbDrive.prototype._getData = function(upath, opt, func){
	this._processRequest(upath, "GET", 200, opt, null, null, /** @type {function(DriveJsonRet)} */(function(a_res){
		func(a_res._restext);
	}));
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
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_parentid: "xxxxxx",
 *   (required)_oldparentid: "yyyyyy",
 *   (required)_doneFunc: function(error){},
 * }
 */
ZbDrive.prototype.updateProp = function(opt){};

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
 * @return {*}
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
ZbDrive.prototype.authorize = function(opt){
	if(!opt){
		throw new Error("Options are not specifed when auth onedrive.");
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
//		throw new Error("Code or refresh token must be specifed when auth onedrive.");
	}

	var ret = null;
	/** @type {XMLHttpRequest} */
	var ajax = new XMLHttpRequest();
	ajax.open("POST", this.authUrl, false); //同期
	ajax.withCredentials = true;
	ajax.send(formData);
	if(ajax.readyState == 4){
		if(ajax.status == 200){
			ret = JSON.parse(ajax.responseText);
		}else{
			throw new Error(ajax.responseText+" ("+ajax.status+")");
		}
	}
	return ret;
};
/**
 * @private
 * @param {DriveAjaxOption} _opt
 */
ZbDrive.prototype.retryAjaxWithLogin = function(_opt){
	console.log("Retry to send ajax.");
	if(_opt){
		_opt._retry = true;
	}else{
		return;
	}
	this.login();
	_opt._auth = /** @type {string} */(this.accessToken);
	this.sendAjax(_opt);
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
	 * @param {function(DriveJsonRet)=} cb
	 */
	this.prepare = function(fsize, cb){
		this.upSize = fsize;
		this.drive.prepareWriter(this.opt, fsize, function(a_url, a_res){
			if(a_url){
				this.upUrl = a_url;
				if(cb){
					cb(a_res);
				}
			}else{
				console.error(a_res);
				throw new Error(JSON.stringify(a_res));
			}
		}.bind(this));
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
		var ajaxGet = function(){
			/** @type {XMLHttpRequest} */
			var ajax = new XMLHttpRequest();
			if(this.tryLevel >= 10){
				ajax.open("GET", /** @type {string} */(this.drive.relayUrl), true);
				ajax.setRequestHeader("Zb-Url", this.url);
			}else{
				ajax.open("GET", this.url, true);
			}
			if(this.opt._auth){
				ajax.setRequestHeader("Authorization", this.opt._auth);
			}else{
				ajax.setRequestHeader("Authorization", this.drive.getToken());
			}
//			if(this.pos > 0 || pos1 < this.size - 1){
				ajax.setRequestHeader("Range", "bytes="+this.pos+"-"+pos1);
//			}
			ajax.responseType = "arraybuffer";
			ajax.onload = function(a_evt){
				if(this.oldreading){
					this.oldreading = 0;
					if(this.reading){
						this._read();
					}
					return;
				}
				this.reading = 0;
				/** @type {XMLHttpRequest} */
				var a_x = a_evt.target;
				if (a_x.readyState == 4){
					if(this.tryLevel < 10){
						this.tryLevel = 1;
					}else{
						this.tryLevel =11;
					}
					if(a_x.status == 200 || a_x.status == 206){
						if(this.retryAuth == 2){
							this.retryAuth = 1;
						}
						/** @type {number} */
						var a_l = parseInt(a_x.getResponseHeader("content-length"), 10);
						if(a_l){
							this.pos += a_l;
						}else{
							/** @type {number} */
							var a_r = analyzeRangePos(a_x.getResponseHeader("content-range"));
							if(a_r){
								this.pos = a_r + 1;
							}else{
								this.pos = pos1 + 1;
							}
						}
						if(a_x.status == 200 && this.pos < this.getSize()){
							this.pos = this.getSize();
						}else if(this.pos > this.getSize()){
							this.pos = this.getSize();
						}
						if(this.onread){
							this.onread(/** @type {ArrayBuffer} */(a_x.response), this);
						}
						a_x.response = null;
					}else if(a_x.status == 401 && this.retryAuth == 1){
						console.log("Retry auth.");
						this.retryAuth = 2;
						this.drive.login();
						if(this.opt._auth){
							delete this.opt._auth;
						}
						ajaxGet();
					}else{
						throw new Error(a_x.responseText+" ("+a_x.status+")");
					}
				}
			}.bind(this);
			ajax.onerror = function(a_evt){
				if(this.tryLevel == 0 && this.drive.relayUrl){
					this.tryLevel = 10;
					ajaxGet();
				}else if(this.tryLevel == 1 || this.tryLevel == 11){
					this.tryLevel++;
					// retry for occasionally server failed
					setTimeout(function(){
						ajaxGet();
					}, 500);
				}
			}.bind(this);
			ajax.send();
		}.bind(this);

		ajaxGet();
	};
}

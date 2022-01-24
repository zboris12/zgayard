/**
 * @constructor
 * @implements {ZBDrive}
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 * @param {string=} _relayUrl
 */
function ZbOneDrive(_storage, _authUrl, _relayUrl){

/** @public @type {string|undefined} */
this.relayUrl = _relayUrl;

/** @private @type {string} */
this.authUrl = _authUrl;
/** @private @type {?string} */
this.accessToken = null;
/** @private @type {ZbLocalStorage} */
this.storage = _storage;

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
 *    (optional)_doneFunc: function(result){}, // result: {"status": 999, "restext": "xxxxx"}
 *    (optional)_retry: false, // Is retry after InvalidAuthenticationToken or not.
 *  }
 */
this.sendAjax = function(opt){
	/** @type {string} */
	var method = "POST";
	/** @type {string} */
	var url = "https://graph.microsoft.com/v1.0".concat(encodeURI(opt._upath));
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
					opt._doneFunc({
						_status: a_x.status, 
						_restext: a_x.responseText,
					});
				}
			}
		}.bind(this);
	}
	ajax.send(opt._data);
};
/**
 * @public
 * @param {boolean=} reuseToken
 * @return {boolean}
 */
this.login = function(reuseToken){
	if(reuseToken){
		this.accessToken = this.storage.getSessionData("access_token");
		if(this.accessToken){
			return true;
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
				showError("Unauthorized access to this url.");
				return false;
			}
		}
		return true;
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
				showError("Unauthorized access to this url.");
				return false;
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
			return true;
		}else if(ret && ret["error"]){
			showError("["+ret["error"]+"] "+ret["error_description"]);
		}else{
			showError("Unknown error occured when doing authorization.");
		}
	}else{
		if(canSkipLogin){
			opt.needCode = true;
		}
		var ret = this.authorize(opt);
		if(ret && ret["url"]){
			if(ret["state"]){
				if(!this.storage.setSessionData("login_state", ret["state"])){
					ret["state"] = ZbOneDrive.id;
				}
			}
			if(ret["logout"]){
				this.storage.setSessionData("logout_url", ret["logout"]);
			}
			window.location.href = ret["url"].concat("&state=".concat(encodeURIComponent(ret["state"])));
		}else if(ret && ret["error"]){
			showError("["+ret["error"]+"] "+ret["error_description"]);
		}else{
			showError("Unknown error occured when doing authorization.");
		}
	}
	return false;
};
/**
 * @public
 */
this.logout = function(){
	this.accessToken = null;
	this.storage.removeSessionData("access_token");
	var lourl = /** @type {string} */(this.storage.getSessionData("logout_url"));
	if(lourl){
		window.location.href = lourl;
		return;
	}

	/** @type {FormData} */
	var formData = new FormData();
	formData.append("drive_type", "onedrive");
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
 * @public
 * @param {DriveGetDriveOption} opt
 *
 * opt: {
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error, data){},
 * }
 */
this.getDrive = function(opt){
	/** @type {DriveAjaxOption} */
	var opt2 = {
		_method: "GET",
		_upath: "/me/drive",
		_doneFunc: function(a_res){
			/** @type {?DriveInfo} */
			var a_dat = null;
			/** @type {boolean} */
			var a_err = false;
			if(a_res._status == 200){
				var a_dat2 = JSON.parse(a_res._restext);
				var a_quota = a_dat2["quota"];
				a_dat = {
					_trash: /** @type {number} */(a_quota["deleted"]),
					_total: /** @type {number} */(a_quota["total"]),
					_used: /** @type {number} */(a_quota["used"]),
				};
			}else{
				a_err = a_res;
			}
			if(opt && opt._doneFunc){
				/** @type {function((boolean|DriveJsonRet), ?DriveInfo)} */(opt._doneFunc)(a_err, a_dat);
			}else if(a_err){
				showError(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	this.copyAuth(opt, opt2);
	this.sendAjax(opt2);
};
/**
 * @public
 * @param {DriveGetItemOption} opt
 *
 * opt: {
 *   (optional)_upath: "aaa/bbb",  //"upath" or "uid" must be specified.
 *   (optional)_uid: "xxxxxx",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error, data){},
 * }
 */
this.getItem = function(opt){
	/** @type {DriveAjaxOption} */
	var opt2 = {
		_upath: "",
		_method: "GET",
		_doneFunc: function(a_res){
			/** @type {?DriveItem} */
			var a_dat = null;
			/** @type {boolean} */
			var a_err = false;
			if(a_res._status == 200){
				a_dat = this.makeReturnItem(/** @type {Object<string, string>} */(JSON.parse(a_res._restext)));
			}else{
				a_err = a_res;
			}
			if(opt && opt._doneFunc){
				/** @type {function((boolean|DriveJsonRet), ?DriveItem)} */(opt._doneFunc)(a_err, a_dat);
			}else if(a_err){
				alert(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	if(opt && opt._upath){
		opt2._upath = "/me/drive/root:/"+opt._upath;
	}else if(opt && opt._uid){
		opt2._upath = "/me/drive/items/"+opt._uid;
	}else{
		throw new Error("No path nor id is specified.");
	}
	this.copyAuth(opt, opt2);
	this.sendAjax(opt2);
};
/**
 * @public
 * @param {DriveListFolderOption} opt
 *
 * opt: {
 *   (optional)_ufolder: "aaa/bbb",  //If "ufolder" and "uid" are both omitted then root will be listed.
 *   (optional)_uid: "xxxxxx",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error, children){},
 * }
 */
this.listFolder = function(opt){
	/** @type {DriveAjaxOption} */
	var opt2 = {
		_upath: "/me/drive/root/children",
		_method: "GET",
		_doneFunc: function(a_res){
			/** @type {Array<DriveItem>} */
			var a_arr = new Array();
			/** @type {boolean} */
			var a_err = false;
			if(a_res._status == 200){
				var a_dat = JSON.parse(a_res._restext);
				a_dat["value"].forEach(function(b_ele, b_idx){
					/** @type {DriveItem} */
					var b_itm = this.makeReturnItem(b_ele);
					a_arr.push(b_itm);
				}, this);
			}else{
				a_err = a_res;
			}
			if(opt && opt._doneFunc){
				/** @type {function((boolean|DriveJsonRet), Array<DriveItem>)} */(opt._doneFunc)(a_err, a_arr);
			}else if(a_err){
				alert(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	if(opt){
		if(opt._ufolder){
			opt2._upath = "/me/drive/root:/"+opt._ufolder+":/children";
		}else if(opt._uid){
			opt2._upath = "/me/drive/items/"+opt._uid+"/children";
		}
		this.copyAuth(opt, opt2);
	}
	this.sendAjax(opt2);
};
/**
 * @public
 * @param {DriveNewFolderOption} opt
 *
 * opt: {
 *   (required)_folder: "zzzz",
 *   (optional)_parentfolder: "aaa/bbb",  //If "parentfolder" and "parentid" are both omitted then root will be the parent folder.
 *   (optional)_parentid: "xxxxxx",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error, folder){},
 * }
 */
this.newFolder = function(opt){
	if(!(opt && opt._folder)){
		throw new Error("Name of new folder is not specified.");
	}

	/** @type {DriveAjaxOption} */
	var opt2 = {
		_headers: {"Content-Type": "application/json;charset=UTF-8"},
		_upath: "/me/drive/root/children",
		_method: "POST",
		_doneFunc: function(a_res){
			/** @type {?DriveItem} */
			var a_dat = null;
			/** @type {boolean} */
			var a_err = false;
			if(a_res._status == 201){
				a_dat = this.makeReturnItem(/** @type {Object<string, string>} */(JSON.parse(a_res._restext)));
			}else{
				a_err = a_res;
			}
			if(opt && opt._doneFunc){
				opt._doneFunc(a_err, /** @type {DriveItem} */(a_dat));
			}else if(a_err){
				throw new Error(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	if(opt._parentfolder){
		opt2._upath = "/me/drive/root:/"+opt._parentfolder+":/children";
	}else if(opt._parentid){
		opt2._upath = "/me/drive/items/"+opt._parentid+"/children";
	}
	this.copyAuth(opt, opt2);

	opt2._data = JSON.stringify({
		"name": opt._folder,
		"folder": new Object(),
		"@microsoft.graph.conflictBehavior": "fail",
	});

	this.sendAjax(opt2);
};
/**
 * @public
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_newname: "xxx.yyy",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error){},
 * }
 */
this.rename = function(opt){
	this.updateProp(opt);
};
/**
 * @public
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (required)_parentid: "xxxxxx",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error){},
 * }
 */
this.move = function(opt){
	this.updateProp(opt);
};
/**
 * @public
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error){},
 * }
 */
this.delete = function(opt){
	if(!(opt && opt._fid)){
		throw new Error("fid is not specified.");
	}

	/** @type {DriveAjaxOption} */
	var opt2 = {
		_upath: "/me/drive/items/".concat(opt._fid),
		_method: "DELETE",
		_doneFunc: function(a_res){
			/** @type {boolean} */
			var a_err = false;
			if(a_res._status != 204){
				a_err = a_res;
			}
			if(opt && opt._doneFunc){
				opt._doneFunc(a_err);
			}else if(a_err){
				throw new Error(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	this.copyAuth(opt, opt2);
	this.sendAjax(opt2);
};
/**
 * @public
 * @param {DriveWriterOption} opt
 * @return {OneDriveWriter}
 */
this.createWriter = function(opt){
	return new OneDriveWriter(opt, this);
};
/**
 * @public
 * @param {DriveReaderOption} opt
 * @return {OneDriveReader}
 */
this.createReader = function(opt){
	return new OneDriveReader(opt, this);
};

/**
 * @private
 * @param {DriveAjaxOption} _opt
 */
this.retryAjaxWithLogin = function(_opt){
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
 * @private
 * @param {Object<string, *>} ele
 * @return {DriveItem}
 */
this.makeReturnItem = function(ele){
	/** @type {DriveItem} */
	var itm = {
		_id: /** @type {string} */(ele["id"]),
		_name: /** @type {string} */(ele["name"]),
		_size: /** @type {number} */(ele["size"]),
		_lastModifiedDateTime: /** @type {string} */(ele["lastModifiedDateTime"]),
		_parent: /** @type {string} */(ele["parentReference"]["path"]),
		_type: "0",
	};
	if(ele["folder"]){
		itm._type = "1";
	}else if(ele["file"]){
		itm._type = "2";
	}
	return itm;
};
/**
 * @private
 * @param {string} type
 * @param {string} token
 */
this.setAccessToken = function(type, token){
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
this.authorize = function(opt){
	if(!opt){
		throw new Error("Options are not specifed when auth onedrive.");
	}

	/** @type {FormData} */
	var formData = new FormData();
	formData.append("drive_type", "onedrive");
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
 * @param {DriveUpdateOption} opt
 *
 * opt: {
 *   (required)_fid: "zzzz",
 *   (optional)_newname: "xxx.yyy",
 *   (optional)_parentid: "xxxxxx",
 *   (optional)_utype: "Bearer",
 *   (optional)_utoken: "xxxxxxxx",
 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
 *   (optional)_doneFunc: function(error){},
 * }
 */
this.updateProp = function(opt){
	if(!(opt && opt._fid)){
		throw new Error("fid is not specified.");
	}

	/** @type {DriveAjaxOption} */
	var opt2 = {
		_headers: {"Content-Type": "application/json;charset=UTF-8"},
		_upath: "/me/drive/items/".concat(opt._fid),
		_method: "PATCH",
		_doneFunc: function(a_res){
			/** @type {boolean} */
			var a_err = false;
			if(a_res._status != 200){
				a_err = a_res;
			}
			if(opt && opt._doneFunc){
				opt._doneFunc(a_err);
			}else if(a_err){
				throw new Error(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	this.copyAuth(opt, opt2);

	/** @type {Object<string, *>} */
	var data = new Object();
	if(opt._newname){
		data["name"] = opt._newname;
	}
	if(opt._parentid){
		data["parentReference"] = { "id": opt._parentid };
	}
	opt2._data = JSON.stringify(data);
	if(opt2._data == "{}"){
		throw new Error("No property to be updated.");
	}
	this.sendAjax(opt2);
};
/**
 * @private
 * @param {Object<string, *>} opt
 * @param {Object<string, *>} opt2
 */
this.copyAuth = function(opt, opt2){
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

}

/**
 * @constructor
 * @implements {ZBWriter}
 * @param {DriveWriterOption} _opt
 * @param {ZbOneDrive} _drv
 *
 * _opt = {
 *   _auth: "xxxxxxxxx",   // optional
 *   _fldr: "a/b",         // optional
 *   _fldrId: "xxxxxx",    // optional
 *   _fnm: "aaa.txt",      // required
 * }
 */
function OneDriveWriter(_opt, _drv){
	/** @private @type {ZbOneDrive} */
	this.drive = _drv;
	/** @private @type {DriveWriterOption} */
	this.opt = _opt;
	/** @private @type {string} */
	this.upUrl = "";
	/** @private @type {number} */
	this.upSize = 0;
	/** @private @type {number} */
	this.pos = 0;

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

		/** @type {DriveAjaxOption} */
		var uopt = {
			_upath: "/me",
			_method: "POST",
			_auth: this.opt._auth,
			_headers: {
				"Content-Type": "application/json;charset=UTF-8",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
			},
			_doneFunc: function(a_res){
				if(a_res._status >= 200 && a_res._status <= 299){
					var a_retdat = JSON.parse(a_res._restext);
					this.upUrl = a_retdat["uploadUrl"];
					if(cb){
						cb(a_res);
					}
				}else{
					showError(JSON.stringify(a_res));
				}
			}.bind(this),
		};

		if(this.opt._fldrId){
			uopt._upath = "/me/drive/items/"+this.opt._fldrId+":/";
 		}else if(this.opt._fldr){
 			if(!this.opt._fldr.startsWith("/drive/root:")){
				uopt._upath += "/drive/root:/";
 			}
			uopt._upath += this.opt._fldr.concat("/");
		}else{
			uopt._upath += "/drive/root:/";
		}
		uopt._upath += this.opt._fnm;
		uopt._upath += ":/createUploadSession";

		/** @type {Object<string, string>} */
		var item = {
			"@microsoft.graph.conflictBehavior": "replace",
		};
		/** @type {number} */
		var i = this.opt._fnm.lastIndexOf("/");
		if(i >= 0){
			item["name"] = this.opt._fnm.slice(i + 1);
		}else{
			item["name"] = this.opt._fnm;
		}
//		item["fileSize"] = this.upSize; // "fileSize" is not supported on onedrive business / sharepoint
		uopt._data = JSON.stringify({
			"item": item,
		});

		this.drive.sendAjax(uopt);
	};

	/**
	 * @public
	 * @param {ArrayBuffer|Array<number>} buf
	 * @param {function(string)=} cb
	 */
	this.write = function(buf, cb){
		/** @type {Blob} */
		var bufblob = new Blob([new Uint8Array(buf)], { "type" : "application/octet-binary" });
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
				/** @type {XMLHttpRequest} */
				var a_x = a_evt.target;
				if (a_x.readyState == 4){
					if(a_x.status >= 200 && a_x.status <= 299){
						if(cb){
							cb(a_x.responseText);
						}
					}else{
						alert(a_x.responseText+" ("+a_x.status+")");
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
		/** @type {XMLHttpRequest} */
		var ajax = new XMLHttpRequest();
		ajax.open("DELETE", this.upUrl, true); //非同期
		ajax.onload = function(a_evt){
			/** @type {XMLHttpRequest} */
			var a_x = a_evt.target;
			if (a_x.readyState == 4){
				/** @type {DriveJsonRet} */
				var a_result = {_status: a_x.status, _restext: a_x.responseText};
				if(a_x.status >= 200 && a_x.status <= 299){
					if(cb){
						cb(false, a_result);
					}
				}else{
					console.log(a_x.responseText+" ("+a_x.status+")");
					if(cb){
						cb(a_result);
					}
				}
			}
		}.bind(this);
		ajax.send();
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
 * @param {ZbOneDrive} _drv
 *
 * _opt = {
 *   _auth: "xxxxxxxxx", // optional
 *   _id: "xxxxx",       // required
 *   _bufSize: 999,      // optional
 * }
 */
function OneDriveReader(_opt, _drv){
	/** @private @type {ZbOneDrive} */
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
	this.bufSize = 1600;
	if(_opt._bufSize){
		this.bufSize = _opt._bufSize;
	}
	/** @private @type {number} */
	this.tryLevel = 0;

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

		this.drive.sendAjax({
			_upath: "/me/drive/items/"+this.opt._id,
			_method: "GET",
			_auth: this.opt._auth,
			_doneFunc: function(a_res){
				this.prepared = true;
				if(a_res._status != 200){
					throw new Error(a_res._restext+" ("+a_res._status+")");
				}
				var a_dat = JSON.parse(a_res._restext);
				this.size = a_dat["size"];
				if(offset){
					if(offset >= this.getSize()){
						throw new Error("offset can not be bigger than input size.");
					}else{
						this.pos = offset;
					}
				}
				this.url = a_dat["@microsoft.graph.downloadUrl"];
				this.name = a_dat["name"];
				if(cb){
					cb();
				}
			}.bind(this),
		});
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
			if(this.pos > 0 || pos1 < this.size - 1){
				ajax.setRequestHeader("Range", "bytes="+this.pos+"-"+pos1);
			}
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

/** @type {string} */
ZbOneDrive.id = "onedrive";
/** @type {function(Object<string, DriveDefine>)} */
ZbOneDrive.addDefine = function(drvs){
	drvs[ZbOneDrive.id] = {
		/** @type {string} */
		_name: "Microsoft OneDrive",
		/** @type {function(ZbLocalStorage, string, string=):ZBDrive} */
		_newInstance: function(_storage, _authUrl, _relayUrl){
			return new ZbOneDrive(_storage, _authUrl, _relayUrl);
		},
		/** @type {function(?Object<string, string>):boolean} */
		_isTarget: function(uparams){
			if(uparams && uparams["state"] == ZbOneDrive.id){
				return true;
			}else{
				return false;
			}
		},
	};
};

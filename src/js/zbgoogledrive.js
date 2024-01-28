//https://developers.google.com/drive/api/v3/reference/

/**
 * @constructor
 * @extends {ZbDrive}
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 */
function ZbGoogleDrive(_storage, _authUrl){
	this.super(_storage, _authUrl);

	/**
	 * @override
	 * @public
	 * @return {string}
	 */
	this.getId = function(){
		return zbGoogleDriveId;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetDriveOption} opt
	 */
	this.getDrive = function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/about").concat(makeQueryString({
			"fields": "storageQuota"
		}));
	
		this._getData(upath, /** @type {DriveBaseOption} */(opt), /** @type {function(string)} */(function(a_restext){
			if(opt && opt._doneFunc){
				var a_dat2 = JSON.parse(a_restext);
				var a_quota = a_dat2["storageQuota"];
				/** @type {DriveInfo} */
				var a_dat = {
					_trash: /** @type {number} */(a_quota["usageInDriveTrash"]),
					_total: /** @type {number} */(a_quota["limit"]),
					_used: /** @type {number} */(a_quota["usage"]),
				};
				opt._doneFunc(false, a_dat);
			}
		}));
	};

	/**
	 * @override
	 * @public
	 * @param {DriveSearchItemsOption} opt
	 */
	this.searchItems = function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/files");
		/** @type {string} */
		var prtid = opt._parentid ? opt._parentid : "root";
		/** @type {string} */
		var cond = "'"+prtid+"' in parents";
		if(opt._fname){
			cond = cond.concat(" and name = '"+opt._fname+"'");
		}
		/** @type {Object<string, string>} */
		var qry = {
			"fields": "files(id,name,mimeType,parents,modifiedTime,size)",
			"q": cond,
		};
		this._getData(upath.concat(makeQueryString(qry, true)), /** @type {DriveBaseOption} */(opt), /** @type {function(string)} */(function(a_restext){
			if(opt && opt._doneFunc){
				/** @type {Array<DriveItem>} */
				var a_arr = [];
				/** @type {*} */
				var a_dat = JSON.parse(a_restext);
				a_dat["files"].forEach(/** @type {function(Object<string, *>)} */(function(b_ele){
					/** @type {DriveItem} */
					var b_itm = this.makeReturnItem(b_ele);
					a_arr.push(b_itm);
				}), this);
				opt._doneFunc(false, a_arr);
			}
		}.bind(this)));
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetItemOption} opt
	 */
	this.getItem = function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/files/").concat(opt._uid);
		/** @type {Object<string, string>} */
		var qry = {
			"fields": "id,name,mimeType,parents,modifiedTime,size"
		};
		this._getData(upath.concat(makeQueryString(qry, true)), /** @type {DriveBaseOption} */(opt), /** @type {function(string)} */(function(a_restext){
			if(opt && opt._doneFunc){
				/** @type {DriveItem} */
				var a_itm = this.makeReturnItem(/** @type {Object<string, *>} */(JSON.parse(a_restext)));
				opt._doneFunc(false, a_itm);
			}
		}.bind(this)));
	};

	/**
	 * @override
	 * @public
	 * @param {DriveNewFolderOption} opt
	 */
	this.newFolder = function(opt){
		if(!(opt && opt._folder)){
			throw new Error("Name of new folder is not specified.");
		}
		/** @type {Object<string, string>} */
		var headers = {"Content-Type": "application/json;charset=UTF-8"};
		/** @type {string} */
		var upath = this.getDrivePath("/files");
		/** @type {string} */
		var prtid = opt._parentid ? opt._parentid : "root";
		/** @type {Object<string, *>} */
		var dat = {
			"mimeType": "application/vnd.google-apps.folder",
			"name": opt._folder,
			"parents": [prtid],
		};

		this._processRequest(upath, "POST", 200, /** @type {DriveBaseOption} */(opt), headers, JSON.stringify(dat), /** @type {function(DriveJsonRet)} */(function(a_res){
			if(opt && opt._doneFunc){
				/** @type {DriveItem} */
				var a_dat = this.makeReturnItem(/** @type {Object<string, *>} */(JSON.parse(a_res._restext)));
				opt._doneFunc(false, a_dat);
			}
		}.bind(this)));
	};

	/**
	 * @override
	 * @public
	 * @param {DriveUpdateOption} opt
	 */
	this.delete = function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/files/").concat(opt._fid);

		this._processRequest(upath, "DELETE", 204, /** @type {DriveBaseOption} */(opt), null, null, /** @type {function(DriveJsonRet)} */(function(a_res){
			if(opt && opt._doneFunc){
				opt._doneFunc(false);
			}
		}));
	};

	/**
	 * @override
	 * @public
	 * @param {DriveWriterOption} opt
	 * @param {number} upSize
	 * @param {function(string, DriveJsonRet)} func
	 */
	this.prepareWriter = function(opt, upSize, func){
		var initUploader = /** @type {function(string=)} */(function(a_fid){
			/** @type {Object<string, *>} */
			var a_dat = {};
			/** @type {string} */
			var a_mthd = "POST";
			/** @type {string} */
			var a_upath = "/files?uploadType=resumable";
			if(a_fid){
				a_mthd = "PATCH";
				a_upath = "/files/"+a_fid+"?uploadType=resumable";
			}else{
				a_dat["name"] = opt._fnm;
				if(opt._fldrId){
					a_dat["parents"] = [opt._fldrId];
				}
			}

			/** @type {DriveAjaxOption} */
			var a_uopt = {
				_upath: "/upload".concat(this.getDrivePath(a_upath)),
				_method: a_mthd,
				_auth: opt._auth,
				_headers: {
					"X-Upload-Content-Length": upSize,
					"X-Upload-Content-Type": "application/octet-stream",
					"Content-Type": "application/json; charset=UTF-8",
				},
				_data: JSON.stringify(a_dat),
			};
			this.sendAjax(a_uopt).then(function(a_resp){
				this.getAjaxJsonRet(a_resp, function(b_res){
					/** @type {string} */
					var b_url = a_resp.ok ? a_resp.headers.get("location") : "";
					func(b_url, b_res);
				}.bind(this));
			}.bind(this));
		}.bind(this));

		/** @type {DriveSearchItemsOption} */
		var sopt = {
			/** @type {function((boolean|DriveJsonRet), Array<DriveItem>=)} */
			_doneFunc: function(a_err, a_dats){
				if(a_err){
					func("", /** @type {DriveJsonRet} */(a_err));
				}else if(a_dats.length > 0){
					initUploader(a_dats[0]._id);
				}else{
					initUploader();
				}
			},
			_fname: opt._fnm,
			_auth: opt._auth,
		};
		if(opt._fldrId){
			sopt._parentid = opt._fldrId;
		}
		this.searchItems(sopt);
	};

	/**
	 * @override
	 * @public
	 * @param {XMLHttpRequest} ajax
	 * @return {number} Next write postion.
	 */
	this.getNextPosition = function(ajax){
		/** @type {Array<number>} */
		const okSts = [200, 201];
		/** @type {Array<number>} */
		const onwaySts = [308];
		if(okSts.indexOf(ajax.status) >= 0){
			return ZbDrvWrtPos.FINISHED;
		}else if(onwaySts.indexOf(ajax.status) < 0){
			return ZbDrvWrtPos.ERROR;
		}
		var rng = /** @type {string} */(ajax.getResponseHeader("range")); // Sample: bytes=0-786431
		if(rng){
			/** @type {number} */
			var i = rng.indexOf("-");
			if(i > 0){
				return parseInt(rng.slice(i + 1), 10) + 1;
			}
		}
		return ZbDrvWrtPos.UNKNOWN;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveReaderOption} opt
	 * @param {function(?DriveItem, DriveJsonRet)} func
	 */
	this.prepareReader = function(opt, func){
		/** @type {string} */
		var upath = this.getDrivePath("/files/").concat(opt._id);
		/** @type {DriveGetItemOption} */
		var uopt = {
			_uid: opt._id,
			_doneFunc: /** @type {function((boolean|DriveJsonRet), DriveItem=)} */(function(a_err, a_itm){
				/** @type {?DriveItem} */
				var a_dat = null;
				if(a_itm && !a_err){
					a_dat = a_itm;
					a_dat._id = this.getAjaxBaseUrl().concat(encodeURI(upath)).concat(makeQueryString({"alt": "media"}));
					if(this.isSkipLogin()){
						a_dat._type = "1";
					}
				}
				func(a_dat, a_err);
			}.bind(this)),
		};
		if(opt._auth){
			uopt._auth = opt._auth;
		}
		this.getItem(uopt);
	};

	/**
	 * @override
	 * @public
	 * @param {Headers} headers
	 * @param {string=} auth
	 */
	this.setReadReqHeader = function(headers, auth){
		if(auth){
			headers.append("Authorization", auth);
		}else{
			headers.append("Authorization", this.getToken());
		}
	};

	/**
	 * @override
	 * @protected
	 * @return {string}
	 */
	this.getAjaxBaseUrl = function(){
		return "https://www.googleapis.com";
	};

	/**
	 * @override
	 * @protected
	 * @param {DriveUpdateOption} opt
	 */
	this.updateProp = function(opt){
		/** @type {boolean} */
		var nodata = true;
		/** @type {Object<string, string>} */
		var headers = {"Content-Type": "application/json;charset=UTF-8"};
		/** @type {string} */
		var upath = this.getDrivePath("/files/").concat(opt._fid);
		if(opt._oldparentid && opt._parentid){
			/** @type {Object<string, string>} */
			var query = {
				"addParents": opt._parentid,
				"removeParents": opt._oldparentid,
			};
			upath = upath.concat(makeQueryString(query));
			nodata = false;
		}
		/** @type {Object<string, string>} */
		var dat = {};
		if(opt._newname){
			dat["name"] = opt._newname;
			nodata = false;
		}
		if(nodata){
			throw new Error("No property to be updated.");
		}

		this._processRequest(upath, "PATCH", 200, /** @type {DriveBaseOption} */(opt), headers, JSON.stringify(dat), /** @type {function(DriveJsonRet)} */(function(a_res){
			if(opt && opt._doneFunc){
				opt._doneFunc(false);
			}
		}));
	};

	/**
	 * @private
	 * @param {string} upath
	 * @return {string}
	 */
	this.getDrivePath = function(upath){
		return "/drive/v3".concat(upath);
	}

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
			_lastModifiedDateTime: /** @type {string} */(ele["modifiedTime"]),
			_type: ZbDrive.ITMTYP_FILE,
		};
		if(ele["parents"] && ele["parents"].length > 0){
			itm._parentId = /** @type {string} */(ele["parents"][0]);
		}
		if(this.isItemFolder(/** @type {string} */(ele["mimeType"]))){
			itm._type = ZbDrive.ITMTYP_FOLDER;
		}
		return itm;
	};

	/**
	 * @private
	 * @param {string} mtyp Mime Type
	 * @return {boolean}
	 */
	 this.isItemFolder = function(mtyp){
	 	return mtyp == "application/vnd.google-apps.folder";
	 };
}

/** @const {string} */
const zbGoogleDriveId = "googledrive";
ZbDrive.addDefine(zbGoogleDriveId, "Google Drive", ZbGoogleDrive);

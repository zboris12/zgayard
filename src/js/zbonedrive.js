/**
 * @constructor
 * @extends {ZbDrive}
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 */
function ZbOneDrive(_storage, _authUrl){
	this.super(_storage, _authUrl);

	/**
	 * @override
	 * @public
	 * @return {string}
	 */
	this.getId = function(){
		return zbOneDriveId;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetDriveOption} opt
	 */
	this.getDrive = function(opt){
		this._getData("/me/drive", /** @type {DriveBaseOption} */(opt), /** @type {function(string)} */(function(a_restext){
			if(opt && opt._doneFunc){
				var a_dat2 = /** @type {Object<string,*>} */(JSON.parse(a_restext));
				var a_quota = /** @type {Object<string,*>} */(a_dat2["quota"]);
				/** @type {DriveInfo} */
				var a_dat = {
					_trash: /** @type {number} */(a_quota["deleted"]),
					_total: /** @type {number} */(a_quota["total"]),
					_used: /** @type {number} */(a_quota["used"]),
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
		var upath = "/me/drive/root/children";
		if(opt){
			if(opt._fname){
				/** @type {function(string)} */
				var getFromPath = function(a_path){
					/** @type {DriveGetItemOption} */
					var a_fopt = {
						_uid: "",
						_doneFunc: /** @type {function((boolean|DriveJsonRet), DriveItem=)} */(function(a_err, a_itm){
							if(opt && opt._doneFunc){
								if(a_err){
									opt._doneFunc(a_err);
								}else{
									/** @type {Array<DriveItem>} */
									var a_arr = [];
									if(a_itm){
										a_arr.push(a_itm);
									}
									opt._doneFunc(false, a_arr);
								}
							}else if(a_err){
								throw new Error(JSON.stringify(a_err));
							}
						}),
					};
					this.copyAuth(opt, a_fopt);
					this.getOneDriveItem(a_fopt, a_path);
				}.bind(this);

				if(opt._parentid){
					/** @type {DriveGetItemOption} */
					var fopt2 = {
						_uid: opt._parentid,
						_doneFunc: /** @type {function((boolean|DriveJsonRet), DriveItem=)} */(function(a_err, a_itm){
							if(a_err){
								if(opt && opt._doneFunc){
									opt._doneFunc(a_err)
								}else{
									throw new Error(JSON.stringify(a_err));
								}
							}else{
								getFromPath(a_itm._parent.concat("/").concat(a_itm._name).concat("/").concat(opt._fname));
							}
						}),
					};
					this.copyAuth(opt, fopt2);
					this.getOneDriveItem(fopt2);
				}else{
					getFromPath("/drive/root:/".concat(opt._fname));
				}
				return;

			}else if(opt._parentid){
				upath = "/me/drive/items/"+opt._parentid+"/children";
			}
		}

		/** @type {Object<string, string>} */
		var qry = {
			"select": "id,name,parentReference,lastModifiedDateTime,size,folder,file"
		};
		this._getData(upath.concat(makeQueryString(qry, true)), /** @type {DriveBaseOption} */(opt), function(a_restext){
			if(opt && opt._doneFunc){
				/** @type {Array<DriveItem>} */
				var a_arr = [];
				if(a_restext){
					var a_dat = /** @type {Object<string, *>} */(JSON.parse(a_restext));
					a_dat["value"].forEach(function(b_ele){
						/** @type {DriveItem} */
						var b_itm = this.makeReturnItem(b_ele);
						a_arr.push(b_itm);
					}, this);
				}
				opt._doneFunc(false, a_arr);
			}
		}.bind(this));
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetItemOption} opt
	 */
	this.getItem = function(opt){
		this.getOneDriveItem(opt);
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
		var upath = "/me/drive/root/children";
		if(opt._parentid){
			upath = "/me/drive/items/"+opt._parentid+"/children";
		}
		/** @type {string} */
		var dat = JSON.stringify({
			"name": opt._folder,
			"folder": {},
			"@microsoft.graph.conflictBehavior": "fail",
		});

		this._processRequest(upath, "POST", 201, /** @type {DriveBaseOption} */(opt), headers, dat, /** @type {function(DriveJsonRet)} */(function(a_res){
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
		var upath = "/me/drive/items/".concat(opt._fid);

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
		/** @type {DriveAjaxOption} */
		var uopt = {
			_upath: "/me",
			_method: "POST",
			_auth: opt._auth,
			_headers: {
				"Content-Type": "application/json;charset=UTF-8",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
			},
		};

		if(opt._fldrId){
			uopt._upath = "/me/drive/items/"+opt._fldrId+":/";
		}else{
			uopt._upath += "/drive/root:/";
		}
		uopt._upath += opt._fnm;
		uopt._upath += ":/createUploadSession";

		/** @type {Object<string, string>} */
		var item = {
			"@microsoft.graph.conflictBehavior": "replace",
			"name": opt._fnm,
		};
//		item["fileSize"] = upSize; // "fileSize" is not supported on onedrive business / sharepoint
		uopt._data = JSON.stringify({
			"item": item,
		});

		this.sendAjax(uopt).then(function(a_resp){
			this.getAjaxJsonRet(a_resp, function(b_res){
				/** @type {string} */
				var b_url = "";
				if(a_resp.ok){
					var b_retdat = JSON.parse(b_res._restext);
					b_url = b_retdat["uploadUrl"];
				}
				func(b_url, b_res);
			}.bind(this));
		}.bind(this));
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
		const onwaySts = [202];
		if(okSts.indexOf(ajax.status) >= 0){
			return ZbDrvWrtPos.FINISHED;
		}else if(onwaySts.indexOf(ajax.status) < 0){
			return ZbDrvWrtPos.ERROR;
		}
		/** @type {*} */
		var dat = JSON.parse(ajax.responseText);
		var rngs = /** @type {Array<string>} */(dat["nextExpectedRanges"]); // Sample: ["26-"]
		if(rngs && rngs.length){
			/** @type {number} */
			var i = rngs[0].indexOf("-");
			if(i > 0){
				return parseInt(rngs[0].substring(0, i), 10);
			}
		}
		return ZbDrvWrtPos.UNKNOWN;
	};

	/**
	 * @override
	 * @public
	 * @param {string} upurl
	 * @param {function((boolean|DriveJsonRet), DriveJsonRet=)=} cb
	 */
	this.cancelUpload = function(upurl, cb){
		/** @type {XMLHttpRequest} */
		var ajax = new XMLHttpRequest();
		ajax.open("DELETE", upurl, true);
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
	 * @override
	 * @public
	 * @param {DriveReaderOption} opt
	 * @param {function(?DriveItem, DriveJsonRet)} func
	 */
	this.prepareReader = function(opt, func){
		/** @type {Object<string, string>} */
		var qry = {
			"select": "name,size,@microsoft.graph.downloadUrl"
		};
		/** @type {string} */
		var upath = "/me/drive/items/".concat(opt._id);
		/** @type {DriveBaseOption} */
		var uopt = {
			_doneFunc: /** @type {function((boolean|DriveJsonRet), *=)} */(function(a_err, a_str){
				/** @type {?DriveItem} */
				var a_itm = null;
				if(a_str && !a_err){
					var a_dat = JSON.parse(a_str);
					a_itm = {
						_id: a_dat["@microsoft.graph.downloadUrl"],
						_name: a_dat["name"],
						_size: a_dat["size"],
					};
				}
				func(a_itm, a_err);
			}),
		};
		if(opt._auth){
			uopt._auth = opt._auth;
		}

		this._getData(upath.concat(makeQueryString(qry, true)), uopt, /** @type {function(string)} */(function(a_restext){
			uopt._doneFunc(false, a_restext);
		}));
	};

	/**
	 * @override
	 * @protected
	 * @return {string}
	 */
	this.getAjaxBaseUrl = function(){
		return "https://graph.microsoft.com/v1.0";
	};

	/**
	 * @override
	 * @protected
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

		/** @type {Object<string, string>} */
		var headers = {"Content-Type": "application/json;charset=UTF-8"};
		/** @type {string} */
		var upath = "/me/drive/items/".concat(opt._fid);
		/** @type {Object<string, *>} */
		var obj = new Object();
		if(opt._newname){
			obj["name"] = opt._newname;
		}
		if(opt._parentid){
			obj["parentReference"] = { "id": opt._parentid };
		}
		/** @type {string} */
		var dat = JSON.stringify(obj);
		if(dat == "{}"){
			throw new Error("No property to be updated.");
		}

		this._processRequest(upath, "PATCH", 200, /** @type {DriveBaseOption} */(opt), headers, dat, /** @type {function(DriveJsonRet)} */(function(a_res){
			if(opt && opt._doneFunc){
				opt._doneFunc(false);
			}
		}));
	};

	/**
	 * @private
	 * @param {DriveGetItemOption} opt
	 * @param {string=} fpath
	 */
	this.getOneDriveItem = function(opt, fpath){
		/** @type {Object<string, string>} */
		var qry = {
			"select": "id,name,parentReference,lastModifiedDateTime,size,folder,file"
		};
		/** @type {string} */
		var upath = "";
		if(fpath){
			if(fpath.startsWith("/me")){
				upath = fpath;
			}else{
				upath = "/me".concat(fpath);
			}
		}else{
			upath = "/me/drive/items/"+opt._uid;
		}
		this._processRequest(upath.concat(makeQueryString(qry, true)), "GET", 0, /** @type {DriveBaseOption} */(opt), null, null, /** @type {function(DriveJsonRet)} */(function(a_res){
			if(opt && opt._doneFunc){
				if(a_res._status == 200){
					/** @type {DriveItem} */
					var a_dat = this.makeReturnItem(/** @type {Object<string, *>} */(JSON.parse(a_res._restext)));
					opt._doneFunc(false, a_dat);
				}else if(a_res._status == 404 && fpath){
					opt._doneFunc(false);
				}else{
					opt._doneFunc(a_res);
				}
			}else if(a_res._status != 200){
				throw new Error(JSON.stringify(a_res));
			}
		}.bind(this)));
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
			_parentId: /** @type {string} */(ele["parentReference"]["id"]),
			_type: "0",
		};
		if(ele["folder"]){
			itm._type = ZbDrive.ITMTYP_FOLDER;
		}else if(ele["file"]){
			itm._type = ZbDrive.ITMTYP_FILE;
		}
		return itm;
	};
}

/** @const {string} */
const zbOneDriveId = "onedrive";
ZbDrive.addDefine(zbOneDriveId, "Microsoft OneDrive", ZbOneDrive);

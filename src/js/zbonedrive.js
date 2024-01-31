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
	 * @param {DriveBaseOption} opt
	 * @return {!Promise<DriveInfo>}
	 */
	this.getDrive = async function(opt){
		/** @type {string} */
		var restext = await this._getData("/me/drive", opt);
		var dat2 = /** @type {Object<string,*>} */(JSON.parse(restext));
		var quota = /** @type {Object<string,*>} */(dat2["quota"]);
		/** @type {DriveInfo} */
		var dat = {
			_trash: /** @type {number} */(quota["deleted"]),
			_total: /** @type {number} */(quota["total"]),
			_used: /** @type {number} */(quota["used"]),
		};
		return dat;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveSearchItemsOption} opt
	 * @return {!Promise<Array<DriveItem>>}
	 */
	this.searchItems = async function(opt){
		/** @type {string} */
		var upath = "/me/drive/root/children";
		if(opt){
			if(opt._fname){
				/** @type {function(string):Promise<Array<DriveItem>>} */
				var getFromPath = async function(a_path){
					/** @type {DriveGetItemOption} */
					var a_fopt = {
						_uid: "",
					};
					this.copyAuth(opt, a_fopt);
					/** @type {?DriveItem} */
					var a_itm = await this.getOneDriveItem(a_fopt, a_path);
					/** @type {Array<DriveItem>} */
					var a_arr = [];
					if(a_itm){
						a_arr.push(a_itm);
					}
					return a_arr;
				}.bind(this);

				if(opt._parentid){
					/** @type {DriveGetItemOption} */
					var fopt2 = {
						_uid: opt._parentid,
					};
					this.copyAuth(opt, fopt2);
					/** @type {?DriveItem} */
					var a_itm = await this.getOneDriveItem(fopt2);
					if(a_itm){
						return await getFromPath(a_itm._parent.concat("/").concat(a_itm._name).concat("/").concat(opt._fname));
					}
				}else{
					return await getFromPath("/drive/root:/".concat(opt._fname));
				}
				return null;

			}else if(opt._parentid){
				upath = "/me/drive/items/"+opt._parentid+"/children";
			}
		}

		/** @type {Object<string, string>} */
		var qry = {
			"select": "id,name,parentReference,lastModifiedDateTime,size,folder,file"
		};
		/** @type {string} */
		var restext = await this._getData(upath.concat(makeQueryString(qry, true)), /** @type {DriveBaseOption} */(opt));
		/** @type {Array<DriveItem>} */
		var arr = [];
		if(restext){
			var dat = /** @type {Object<string, *>} */(JSON.parse(restext));
			dat["value"].forEach(function(b_ele){
				/** @type {DriveItem} */
				var b_itm = this.makeReturnItem(b_ele);
				arr.push(b_itm);
			}, this);
		}
		return arr;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetItemOption} opt
	 * @return {!Promise<?DriveItem>}
	 */
	this.getItem = async function(opt){
		return await this.getOneDriveItem(opt);
	};

	/**
	 * @override
	 * @public
	 * @param {DriveNewFolderOption} opt
	 * @return {!Promise<DriveItem>}
	 */
	this.newFolder = async function(opt){
		if(!(opt && opt._folder)){
			throw new Error("Name of new folder is not specified.");
		}
		/** @type {Headers} */
		var headers = new Headers();
		headers.append("Content-Type", "application/json;charset=UTF-8");
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

		/** @type {DriveJsonRet} */
		var res = await this._processRequest(upath, "POST", 201, /** @type {DriveBaseOption} */(opt), headers, dat);
		/** @type {DriveItem} */
		var rdat = this.makeReturnItem(/** @type {Object<string, *>} */(JSON.parse(res._restext)));
		return rdat;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveUpdateOption} opt
	 * @return {!Promise<number>}
	 */
	this.delete = async function(opt){
		/** @type {string} */
		var upath = "/me/drive/items/".concat(opt._fid);

		await this._processRequest(upath, "DELETE", 204, /** @type {DriveBaseOption} */(opt), null, null);
		return 0;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveWriterOption} opt
	 * @param {number} upSize
	 * @return {!Promise<string>}
	 */
	this.prepareWriter = async function(opt, upSize){
		/** @type {DriveAjaxOption} */
		var uopt = {
			_upath: "/me",
			_method: "POST",
			_auth: opt._auth,
			_headers: new Headers({
				"Content-Type": "application/json;charset=UTF-8",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
			}),
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

		/** @type {Response} */
		var a_resp = await this.sendAjax(uopt);
		/** @type {DriveJsonRet} */
		var b_res = await this.getAjaxJsonRet(a_resp);
		/** @type {string} */
		var b_url = "";
		if(a_resp.ok){
			var b_retdat = JSON.parse(b_res._restext);
			b_url = b_retdat["uploadUrl"];
		}
		return b_url;
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
	 * @return {!Promise<?DriveItem>}
	 */
	this.prepareReader = async function(opt){
		/** @type {Object<string, string>} */
		var qry = {
			"select": "name,size,@microsoft.graph.downloadUrl"
		};
		/** @type {string} */
		var upath = "/me/drive/items/".concat(opt._id);
		/** @type {DriveBaseOption} */
		var uopt = {};
		if(opt._auth){
			uopt._auth = opt._auth;
		}

		/** @type {string} */
		var a_str = await this._getData(upath.concat(makeQueryString(qry, true)), uopt);
		/** @type {?DriveItem} */
		var a_itm = null;
		if(a_str){
			var a_dat = JSON.parse(a_str);
			a_itm = {
				_id: a_dat["@microsoft.graph.downloadUrl"],
				_name: a_dat["name"],
				_size: a_dat["size"],
			};
		}
		return a_itm;
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
	 * @return {!Promise<number>}
	 *
	 * opt: {
	 *   (required)_fid: "zzzz",
	 *   (optional)_newname: "xxx.yyy",
	 *   (optional)_parentid: "xxxxxx",
	 *   (optional)_utype: "Bearer",
	 *   (optional)_utoken: "xxxxxxxx",
	 *   (optional)_auth: "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
	 * }
	 */
	this.updateProp = async function(opt){
		if(!(opt && opt._fid)){
			throw new Error("fid is not specified.");
		}

		/** @type {Headers} */
		var headers = new Headers();
		headers.append("Content-Type", "application/json;charset=UTF-8");
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

		await this._processRequest(upath, "PATCH", 200, /** @type {DriveBaseOption} */(opt), headers, dat);
		return 0;
	};

	/**
	 * @private
	 * @param {DriveGetItemOption} opt
	 * @param {string=} fpath
	 * @return {!Promise<?DriveItem>}
	 */
	this.getOneDriveItem = async function(opt, fpath){
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
		/** @type {DriveJsonRet} */
		var res = await this._processRequest(upath.concat(makeQueryString(qry, true)), "GET", 0, /** @type {DriveBaseOption} */(opt), null, null);
		if(res._status == 200){
			/** @type {DriveItem} */
			var dat = this.makeReturnItem(/** @type {Object<string, *>} */(JSON.parse(res._restext)));
			return dat;
		}else if(res._status == 404 && fpath){
			return null;
		}else{
			throw new Error(JSON.stringify(res));
		}
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

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
	 * @param {DriveBaseOption} opt
	 * @return {!Promise<DriveInfo>}
	 */
	this.getDrive = async function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/about").concat(makeQueryString({
			"fields": "storageQuota"
		}));

		/** @type {string} */
		var restext = await this._getData(upath, opt);
		var dat2 = JSON.parse(restext);
		var quota = dat2["storageQuota"];
		/** @type {DriveInfo} */
		var dat = {
			_trash: /** @type {number} */(quota["usageInDriveTrash"]),
			_total: /** @type {number} */(quota["limit"]),
			_used: /** @type {number} */(quota["usage"]),
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
		/** @type {string} */
		var restext = await this._getData(upath.concat(makeQueryString(qry, true)), /** @type {DriveBaseOption} */(opt));
		/** @type {Array<DriveItem>} */
		var arr = [];
		/** @type {*} */
		var dat = JSON.parse(restext);
		dat["files"].forEach(/** @type {function(Object<string, *>)} */(function(b_ele){
			/** @type {DriveItem} */
			var b_itm = this.makeReturnItem(b_ele);
			arr.push(b_itm);
		}), this);
		return arr;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetItemOption} opt
	 * @return {!Promise<DriveItem>}
	 */
	this.getItem = async function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/files/").concat(opt._uid);
		/** @type {Object<string, string>} */
		var qry = {
			"fields": "id,name,mimeType,parents,modifiedTime,size"
		};
		/** @type {string} */
		var restext = await this._getData(upath.concat(makeQueryString(qry, true)), /** @type {DriveBaseOption} */(opt));
		/** @type {DriveItem} */
		var itm = this.makeReturnItem(/** @type {Object<string, *>} */(JSON.parse(restext)));
		return itm;
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
		var upath = this.getDrivePath("/files");
		/** @type {string} */
		var prtid = opt._parentid ? opt._parentid : "root";
		/** @type {Object<string, *>} */
		var dat = {
			"mimeType": "application/vnd.google-apps.folder",
			"name": opt._folder,
			"parents": [prtid],
		};

		/** @type {DriveJsonRet} */
		var res = await this._processRequest(upath, "POST", 200, /** @type {DriveBaseOption} */(opt), headers, JSON.stringify(dat));
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
		var upath = this.getDrivePath("/files/").concat(opt._fid);
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

		/** @type {DriveSearchItemsOption} */
		var sopt = {
			_fname: opt._fnm,
			_auth: opt._auth,
		};
		if(opt._fldrId){
			sopt._parentid = opt._fldrId;
		}
		/** @type {Array<DriveItem>} */
		var dats = await this.searchItems(sopt);
		if(dats.length > 0){
			return await this.initUploader(opt, upSize, dats[0]._id);
		}else{
			return await this.initUploader(opt, upSize);
		}
	};

	/**
	 * @override
	 * @public
	 * @param {Response} resp
	 * @return {!Promise<number>} Next write postion.
	 */
	this.getNextPosition = async function(resp){
		/** @type {Array<number>} */
		const okSts = [200, 201];
		/** @type {Array<number>} */
		const onwaySts = [308];
		if(okSts.indexOf(resp.status) >= 0){
			return ZbDrvWrtPos.FINISHED;
		}else if(onwaySts.indexOf(resp.status) < 0){
			return ZbDrvWrtPos.ERROR;
		}
		var rng = /** @type {string} */(resp.headers.get("range")); // Sample: bytes=0-786431
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
	 * @return {!Promise<?DriveItem>}
	 */
	this.prepareReader = async function(opt){
		/** @type {string} */
		var upath = this.getDrivePath("/files/").concat(opt._id);
		/** @type {DriveGetItemOption} */
		var uopt = {
			_uid: opt._id,
		};
		if(opt._auth){
			uopt._auth = opt._auth;
		}
		/** @type {DriveItem} */
		var itm = await this.getItem(uopt);
		if(itm){
			itm._id = this.getAjaxBaseUrl().concat(encodeURI(upath)).concat(makeQueryString({"alt": "media"}));
			if(this.isSkipLogin()){
				itm._type = "1";
			}
		}
		return itm;
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
	 * @return {!Promise<number>}
	 */
	this.updateProp = async function(opt){
		/** @type {boolean} */
		var nodata = true;
		/** @type {Headers} */
		var headers = new Headers();
		headers.append("Content-Type", "application/json;charset=UTF-8");
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

		await this._processRequest(upath, "PATCH", 200, /** @type {DriveBaseOption} */(opt), headers, JSON.stringify(dat));
		return 0;
	};

	/**
	 * @private
	 * @param {DriveWriterOption} opt
	 * @param {number} upSize
	 * @param {string=} a_fid
	 * @return {!Promise<string>}
	 */
	this.initUploader = async function(opt, upSize, a_fid){
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
			_headers: new Headers({
				"X-Upload-Content-Length": upSize,
				"X-Upload-Content-Type": "application/octet-stream",
				"Content-Type": "application/json; charset=UTF-8",
			}),
			_data: JSON.stringify(a_dat),
		};
		/** @type {Response} */
		var a_resp = await this.sendAjax(a_uopt);
		if(a_resp.ok){
			return a_resp.headers.get("location") || "";
		}else{
			/** @type {DriveJsonRet} */
			var a_res = await this.getAjaxJsonRet(a_resp);
			throw new Error(a_res._restext);
		}
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

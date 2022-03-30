/**
 * @constructor
 */
function ZbLocalStorage(){

/** @private @final @const {string} */
this.LSNM = "zgayard1946";

/** @private @type {boolean} */
this.sessionOk = true;
/** @private @type {Object<string, string|Object<string, string>>} */
this.datas = null;
/** @private @type {Object<string, string>} */
this.sesdat = null;
/** @private @type {boolean} */
this.needSave = false;
/** @private @type {boolean} */
this.skipLogin = false;

/**
 * @public
 * @return {boolean}
 */
this.isReady = function(){
	return (this.datas != null);
};

/**
 * @public
 * @param {boolean=} all If it's true,  then clear all session datas except language.
 * @return {boolean}
 */
this.clearSession = function(all){
	if(this.sessionOk){
		try{
			/** @type {?string} */
			var lang = window.sessionStorage.getItem("language");
			/** @type {?string} */
			var rurl = window.sessionStorage.getItem("relay_url");
			/** @type {?string} */
			var drvnm = window.sessionStorage.getItem("drive");
			/** @type {?string} */
			var flg = window.sessionStorage.getItem("skipLogin");
			window.sessionStorage.clear();
			if(lang){
				window.sessionStorage.setItem("language", lang);
			}
			if(rurl && !all){
				window.sessionStorage.setItem("relay_url", rurl);
			}
			if(drvnm && !all){
				window.sessionStorage.setItem("drive", drvnm);
			}
			if(flg && !all){
				window.sessionStorage.setItem("skipLogin", flg);
			}
			return true;
		}catch(ex){
			this.sessionOk = false;
			console.error(ex);
		}
	}
	return false;
};
/**
 * @public
 * @param {string} _key
 * @return {?string} The session data
 */
this.getSessionData = function(_key){
	/** @type {?string} */
	var ret = null;
	if(this.sessionOk){
		try{
			ret = window.sessionStorage.getItem(_key);
		}catch(ex){
			this.sessionOk = false;
			console.error(ex);
		}
	}
	return ret;
};
/**
 * @public
 * @param {string} _key
 * @param {string|boolean} _tgt
 * @return {boolean} Is same or not
 */
this.checkSessionData = function(_key, _tgt){
	/** @type {string|boolean|null} */
	var dat = this.getSessionData(_key);
	if(dat && _tgt == dat){
		return true;
	}else{
		return false;
	}
};
/**
 * @public
 * @param {string} _key
 * @param {string|boolean} _dat
 * @return {boolean} Set ok or not
 */
this.setSessionData = function(_key, _dat){
	if(this.sessionOk){
		try{
			window.sessionStorage.setItem(_key, _dat.toString());
			return true;
		}catch(ex){
			this.sessionOk = false;
			console.error(ex);
		}
	}
	return false;
};
/**
 * @public
 * @param {string} _key
 * @return {boolean} Remove ok or not
 */
this.removeSessionData = function(_key){
	if(this.sessionOk){
		try{
			window.sessionStorage.removeItem(_key);
			return true;
		}catch(ex){
			this.sessionOk = false;
			console.error(ex);
		}
	}
	return false;
};
/**
 * @public
 */
this.restoreFromSession = function(){
	/** @type {?string} */
	var lang = this.getSessionData("language");
	/** @type {?string} */
	var rurl = this.getSessionData("relay_url");
	/** @type {?string} */
	var drv = this.getSessionData("drive");
	/** @type {?string} */
	var flg = this.getSessionData("skipLogin");
	this.sesdat = new Object();
	if(lang){
		this.sesdat.language = lang;
		this.setLanguage(lang);
	}
	if(rurl){
		this.sesdat.relayUrl = rurl;
		this.setRelayUrl(rurl);
	}
	if(drv){
		this.sesdat.drive = drv;
		this.setDrive(drv);
	}
	if(flg){
		this.setSkipLogin(flg);
	}
}
/**
 * @public
 * @param {boolean} trySession
 * @return {?string} Drive's name
 */
this.getDrive = function(trySession){
	var drvnm = /** @type {?string} */ (this.getValue("drive"));
	if(!drvnm && trySession){
		if(!this.sesdat){
			this.restoreFromSession();
		}
		drvnm = this.sesdat.drive;
	}
	return drvnm;
};
/**
 * @public
 * @param {string} drvnm
 * @return {boolean} Set ok or not
 */
this.setDrive = function(drvnm){
	if(this.setSettingData("drive", drvnm)){
		if(!this.datas[drvnm]){
			this.datas[drvnm] = new Object();
		}
		return true;
	}else if(this.datas){
		return false;
	}else{
		return true;
	}
};
/**
 * @public
 * @return {boolean} Is skip login or not
 */
this.isSkipLogin = function(){
	return this.skipLogin;
};
/**
 * @public
 * @param {boolean|string} flg
 */
this.setSkipLogin = function(flg){
	if(flg){
		this.skipLogin = this.isReady();
	}else{
		this.skipLogin = false;
		if(this.deleteDriveData("refresh_token")){
			this.needSave = true;
		}
	}
	this.setSessionData("skipLogin", this.skipLogin);
};
/**
 * @public
 * @param {boolean=} trySession
 * @return {?string} Language
 */
this.getLanguage = function(trySession){
	var lang = /** @type {?string} */ (this.getValue("language"));
	if(!lang && trySession && this.sesdat){
		lang = this.sesdat.language;
	}
	return lang;
};
/**
 * @public
 * @param {string} lang
 * @return {boolean} Set ok or not
 */
this.setLanguage = function(lang){
	return this.setSettingData("language", lang);
};

/**
 * @public
 * @return {string} Relay Url
 */
this.getRelayUrl = function(){
	var rurl = /** @type {?string} */ (this.getValue("relay_url"));
	if(!rurl && this.sesdat){
		rurl = this.sesdat.relayUrl;
	}
	return rurl ? rurl : "";
};
/**
 * @public
 * @param {string} rurl
 * @return {boolean} Set ok or not
 */
this.setRelayUrl = function(rurl){
	return this.setSettingData("relay_url", rurl);
};

/**
 * @public
 * @param {function(?string=)} func function(a_err){}
 */
this.initIdxDb = function(func){
	/** @const {string} */
	const msg = "IndexedDB is not supported in your browser settings.";
	if(!window.indexedDB){
		if(func){
			func(msg);
		}else{
			throw new Error(msg);
		}
		return;
	}
	/** @type {IDBOpenDBRequest} */
	var request = window.indexedDB.open(this.LSNM);
	/**
	 * @param {Event} a_evt
	 */
	request.onerror = function(a_evt){
		if(func){
			func(msg);
		}else{
			throw new Error(msg);
		}
	};
	/**
	 * @param {Event} a_evt
	 */
	request.onupgradeneeded = function(a_evt){
		/** @type {IDBDatabase} */
		var a_db = a_evt.target.result;
		/** @type {IDBObjectStore} */
		var a_store = a_db.createObjectStore("settings", {
			"keyPath": "key"
		});
//			a_store.transaction.oncomplete = function(b_evt){
//				console.log("aa");
//			};
	};
	/**
	 * @param {Event} a_evt
	 */
	request.onsuccess = function(a_evt){
		/** @type {IDBDatabase} */
		var a_db = a_evt.target.result;
		/** @type {IDBTransaction} */
		var a_trans = a_db.transaction("settings", "readwrite");
		/**
		 * @param {Event} b_evt
		 */
		a_trans.oncomplete = function(b_evt){
			a_db.close();
			if(func){
				func();
			}
		};
		/** @type {IDBObjectStore} */
		var a_store = a_trans.objectStore("settings");
		/** @type {IDBRequest} */
		var a_req = a_store.getAll();
		/**
		 * @param {Event} b_evt
		 */
		a_req.onsuccess = function(b_evt){
			this.datas = new Object();
			b_evt.target.result.forEach(function(c_ele, c_idx){
				this.datas[c_ele["key"]] = c_ele["value"];
			}.bind(this));
			/** @type {string} */
			var b_drvnm = this.datas["drive"];
			if(b_drvnm && this.datas[b_drvnm] && this.datas[b_drvnm]["refresh_token"]){
				this.skipLogin = true;
			}else{
				this.skipLogin = false;
			}
		}.bind(this);
	}.bind(this);
};
/**
 * @public
 * @param {function(?string=)} func function(a_err){}
 */
this.dropIdxDb = function(func){
	/** @const {string} */
	const msg = "Failed to dropt IndexedDB.";
	/** @type {IDBOpenDBRequest} */
	var request = window.indexedDB.deleteDatabase(this.LSNM);
	/**
	 * @param {Event} a_evt
	 */
	request.onerror = function(a_evt){
		if(func){
			func(msg);
		}else{
			throw new Error(msg);
		}
	};
	/**
	 * @param {Event} a_evt
	 */
	request.onsuccess = function(a_evt){
		this.clearSession(true);
		this.datas = null;
		this.skipLogin = false;
		if(func){
			func();
		}else{
			console.log("IndexedDB has been dropped.");
		}
	}.bind(this);
};
/**
 * @public
 */
this.saveAllData = function(){
	if(!this.needSave || !this.datas){
		return;
	}
	this.processData(/** @type function(IDBObjectStore) */(function(a_store){
		/** @type {IDBRequest} */
		var a_req = a_store.clear();
		/**
		 * @param {Event} b_evt
		 */
		a_req.onsuccess = function(b_evt){
			for(var b_k in this.datas){
				a_store.put({"key": b_k, "value": this.datas[b_k]});
			}
		}.bind(this);
	}).bind(this));
	this.needSave = false;
};
/**
 * @public
 * @param {string} key
 * @return {?string}
 */
this.getDriveData = function(key){
	var drvnm = /** @type {string} */ (this.getValue("drive"));
	if(drvnm){
		var drv = /** @type {Object<string, string>} */ (this.datas[drvnm]);
		if(drv){
			return drv[key];
		}
	}
	return null;
};
/**
 * @public
 * @param {string} key
 * @return {boolean}
 */
this.deleteDriveData = function(key){
	var drvnm = /** @type {string} */ (this.getValue("drive"));
	if(drvnm){
		var drv = /** @type {Object<string, string>} */ (this.datas[drvnm]);
		if(drv && drv[key]){
			delete drv[key];
			return true;
		}
	}
	return false;
};

/**
 * @public
 * @param {string} key
 * @param {?string} data
 * @param {boolean|function()=} func 
 *
 * If func is not specified, saving to db will not be executed.
 * But the needSave flag will be set.
 */
this.saveDriveData = function(key, data, func){
	if(!this.datas){
		if(func && func instanceof Function){
			func();
		}
		return;
	}
	var drvnm = /** @type {string} */ (this.getValue("drive"));
	if(data){
		if(!this.datas[drvnm]){
			this.datas[drvnm] = new Object();
		}
		this.datas[drvnm][key] = data;
	}else if(this.datas[drvnm]){
		delete this.datas[drvnm][key];
	}else{
		if(func && func instanceof Function){
			func();
		}
		return;
	}

	if(func){
		/** @type {function()|undefined} */
		var _func = undefined;
		if(func instanceof Function){
			_func = func;
		}
		this.processData(/** @type function(IDBObjectStore) */(function(a_store){
			a_store.put({"key": drvnm, "value": this.datas[drvnm]});
		}).bind(this), _func);
	}else{
		this.needSave = true;
	}
};
/**
 * @public
 * @param {function()=} func function(){}
 */
this.clearLogInfo = function(func){
	this.clearSession(true);
	if(!this.datas){
		if(func){
			func();
		}
		return;
	}

	var drvnm = /** @type {string} */ (this.getValue("drive"));
	delete this.datas[drvnm]["refresh_token"];
	delete this.datas["drive"];
	this.processData(/** @type function(IDBObjectStore) */(function(a_store){
		a_store.put({"key": drvnm, "value": this.datas[drvnm]});
		a_store.delete("drive");
	}).bind(this), func);
};
/**
 * @public
 * @param {string} fid
 * @param {string} ctime
 * @param {function()=} func function(){}
 */
this.saveRecent = function(fid, ctime, func){
	/** @type {Object<string, string>} */
	var val = {
		"drive": /** @type {string} */ (this.getValue("drive")),
		"root": this.getDriveData("root"),
		"fid": fid,
		"time": ctime,
	};
	this.saveData("recent", val, func);
};
/**
 * @public
 * @return {Object<string, string>}
 */
this.getRecent = function(){
	var val = /** @type {Object<string, string>} */(this.getValue("recent"));
	if(val && val["drive"] == this.getValue("drive") && val["root"] == this.getDriveData("root")){
		return val;
	}else{
		return null;
	}
};

// --- Private methods Start --- //
/**
 * @private
 * @param {function(!IDBObjectStore)} datafunc function(a_store){}
 * @param {function()=} endfunc function(){}
 */
this.processData = function(datafunc, endfunc){
	/** @type {IDBOpenDBRequest} */
	var request = window.indexedDB.open(this.LSNM);
	/**
	 * @param {Event} a_evt
	 */
	request.onsuccess = function(a_evt){
		/** @type {IDBDatabase} */
		var a_db = a_evt.target.result;
		/** @type {IDBTransaction} */
		var a_trans = a_db.transaction("settings", "readwrite");
		/**
		 * @param {Event} b_evt
		 */
		a_trans.oncomplete = function(b_evt){
			a_db.close();
			if(endfunc){
				endfunc();
			}
		};
		/** @type {!IDBObjectStore} */
		var a_store = a_trans.objectStore("settings");
		if(datafunc){
			datafunc(a_store);
		}
	};
};
/**
 * @private
 * @param {string} _key
 * @param {string} _value
 * @return {boolean} Set ok or not
 */
this.setSettingData = function(_key, _value){
	if(_value){
		this.setSessionData(_key, _value);
		if(this.datas){
			if(this.datas[_key] != _value){
				this.datas[_key] = _value;
				this.needSave = true;
				return true;
			}
		}
	}else{
		this.removeSessionData(_key);
		if(this.datas && this.datas[_key]){
			delete this.datas[_key];
			this.needSave = true;
			return true;
		}
	}
	return false;
};
/**
 * @private
 * @param {!string} key
 * @return {string|Object<string, string>|null}
 */
this.getValue = function(key){
	if(this.datas && this.datas[key]){
		return this.datas[key];
	}else{
		return null;
	}
};
/**
 * @private
 * @param {string} key
 * @param {string|Object<string, string>} value
 * @param {function()=} func function(){}
 */
this.saveData = function(key, value, func){
	if(this.datas){
		this.datas[key] = value;
	}
	this.processData(/** @type function(IDBObjectStore) */(function(a_store){
		a_store.put({"key": key, "value": value});
	}).bind(this), func);
};
// --- Private methods End --- //
}

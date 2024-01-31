/**
 * @typedef
 * {{
 *    _id: string,
 *    _idx: number,
 *    _size: number,
 * }}
 */
var IdxDbDataInfo;

/**
 * @constructor
 * @implements {ZBReader}
 * @param {DriveReaderOption} _opt
 * @param {ZbDrive} _drv
 *
 * _opt = {
 *   _id: "xxxxx",
 *   _bufSize: 999,  // optional
 * }
 */
function IdxDbReader(_opt, _drv){
	/** @private @type {ZbDrive} */
	this.drive = _drv;
	/** @private @type {DriveReaderOption} */
	this.opt = _opt;
	/** @private @type {Array<IdxDbDataInfo>} */
	this.dataInfos = null;
	/** @private @type {number} */
	this.size = 0;
	/** @private @type {number} */
	this.pos = 0;

	/**
	 * current data (a bytes array)
	 *
	 * @private 
	 * @type {Array<number>}
	 */
	this.curdat = null;
	/**
	 * current data's index
	 *
	 * @private 
	 * @type {number}
	 */
	this.idx = 0;
	/**
	 * current data's start position
	 *
	 * @private 
	 * @type {number}
	 */
	this.stpos = 0;

	/**
	 * buffer size per read
	 *
	 * @private
	 * @type {number}
	 */
	this.bufSize = 1600;
	if(_opt._bufSize){
		this.bufSize = _opt._bufSize;
	}
	/** @public @type {?function(ArrayBuffer, *)} */
	this.onread = null;

	/**
	 * @public
	 * @param {number=} offset
	 * @param {function()=} cb
	 */
	this.prepare = function(offset, cb){
		this.drive.prepareReader(this.opt, function(a_dat, a_res){
			if(a_dat){
				this.size = a_dat._size;
				this.drive.fetchDataInfos(this.opt._id, function(b_arr){
					this.dataInfos = b_arr;
					this.dataInfos.sort(function(c_a, c_b){
						return c_a._idx - c_b._idx;
					});
					this.checkOffset(offset);
					if(cb){
						cb();
					}
				}.bind(this));
			}else{
				throw new Error(a_res._restext+" ("+a_res._status+")");
			}
		}.bind(this));
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
		if(this.dataInfos){
			return this.idx >= this.dataInfos.length;
		}else{
			return true;
		}
	};
	/**
	 * @public
	 * @param {number=} size
	 */
	this.read = function(size){
		if(this.curdat){
			this.readData(size);
		}else{
			this.drive.fetchData(this.dataInfos[this.idx]._id, function(a_dat){
				/** @type {WordArray} */
				var a_words = CryptoJS.enc.Base64url.parse(a_dat);
				this.curdat = wordArrayToBytes(a_words);
				this.readData(size);
			}.bind(this));
		}
	};
	/**
	 * @public
	 */
	this.dispose = function(){
		this.dataInfos = null;
		this.curdat = null;
	};

	/**
	 * @private
	 * @param {number=} offset
	 */
	this.checkOffset = function(offset){
		if(offset){
			if(offset >= this.getSize()){
				throw new Error("offset can not be bigger than input size.");
			}else{
				this.pos = offset;
			}

			/** @type {number} */
			var i = 0;
			/** @type {number} */
			var sz = 0;
			for(i = 0; i < this.dataInfos.length; i++){
				sz += this.dataInfos[i]._size;
				if(this.pos < sz){
					break;
				}else{
					this.stpos = sz;
				}
			}
			if(i < this.dataInfos.length){
				this.idx = i;
			}else{
				throw new Error("offset can not be bigger than input size.");
			}

		}else{
			this.pos = 0;
			this.stpos = 0;
			this.idx = 0;
		}
		this.curdat = null;
	}

	/**
	 * @private
	 * @param {number=} size
	 */
	this.readData = function(size){
		/** @type {number} */
		var st = this.pos - this.stpos;
		/** @type {number} */
		var remain = this.curdat.length - st;
		if(size){
			if(size < remain){
				remain = size;
			}
		}else if(this.bufSize < remain){
			remain = this.bufSize;
		}
		/** @type {Uint8Array} */
		var dat = new Uint8Array(this.curdat.slice(st, st + remain));
		this.pos += remain;
		if(this.curdat.length == st + remain){
			this.curdat = null;
			this.idx++;
			this.stpos = this.pos;
		}
		if(this.onread){
			this.onread(dat.buffer, this);
		}
	};
}

/**
 * @constructor
 * @implements {ZBWriter}
 * @param {DriveWriterOption} _opt
 * @param {ZbDrive} _drv
 *
 * _opt = {
 *   _fnm: "aaa.txt",
 *   _fldrId: "xxxxxx",
 * }
 */
function IdxDbWriter(_opt, _drv){
	/** @private @type {ZbDrive} */
	this.drive = _drv;
	/** @private @type {DriveWriterOption} */
	this.opt = _opt;
	/** @private @type {DriveItem} */
	this.data = {
		_id: "",
		_name: "",
		_size: 0,
		_parentId: "",
		_type: ZbDrive.ITMTYP_FILE,
	};
	/** @private @type {number} */
	this.fsize = 0;
	/** @private @type {number} */
	this.ridx = 0;

	/**
	 * @public
	 * @param {number} fsize
	 * @return {!Promise<void>}
	 */
	this.prepare = async function(fsize){
		this.fsize = fsize;
		this.data._name = this.opt._fnm;
		if(this.opt._fldrId){
			this.data._parentId = this.opt._fldrId;
		}
		this.data._id = await this.drive.prepareWriter(this.opt, fsize);
	};

	/**
	 * @public
	 * @param {ArrayBuffer|Array<number>} buf
	 * @param {function()=} cb
	 */
	this.write = function(buf, cb){
		// if(this.opt._fnm == g_CONFILE){
			// /** @type {WordArray} */
			// var a_words = new CryptoJS.lib.WordArray.init(buf);
			// console.log(a_words.toString(CryptoJS.enc.Utf8));
		// }
		/** @type {WordArray} */
		var words = null;
		if(Array.isArray(buf)){
			words = new CryptoJS.lib.WordArray.init(new Uint8Array(buf));
		}else{
			words = new CryptoJS.lib.WordArray.init(buf);
		}
		this.data._size += words.sigBytes;
		/** @type {string} */
		var data = words.toString(CryptoJS.enc.Base64url);
		this.ridx++;
		this.drive.saveData(this.data._id, this.ridx, words.sigBytes, data, function(){
			if(this.data._size >= this.fsize){
				this.drive.saveItem(this.data, cb);
			}else if(cb){
				cb();
			}
		}.bind(this));
	};

	/**
	 * @public
	 * @param {function((boolean|DriveJsonRet), DriveJsonRet=)=} cb
	 *
	 * cb: function(a_err, a_result){}
	 * a_result: {_status: 999, _restext: "xxxxx"}
	 */
	this.cancel = function(cb){
		this.drive.delete({
			_fid: this.data._id,
			_doneFunc: function(a_ret){
				if(cb){
					cb(a_ret);
				}
			},
		});
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getTotalSize = function(){
		return this.fsize;
	};
}

/**
 * @constructor
 * @extends {ZbDrive}
 * @param {ZbLocalStorage} _storage
 * @param {string} _authUrl
 */
function ZbIdxDbDrive(_storage, _authUrl){
	this.super(_storage, _authUrl);

	/**
	 * @override
	 * @public
	 * @return {string}
	 */
	this.getId = function(){
		return ZbIdxDbDrive.DriveId;
	};

	/**
	 * @override
	 * @param {boolean=} reuseToken
	 * @return {!Promise<string?>}
	 */
	this.login = function(reuseToken){
		return new Promise(function(resolve, reject){
			this.checkDb(resolve);
		});
	};

	/**
	 * @override
	 * @public
	 */
	this.logout = function(){
		location.reload();
	};

	/**
	 * @override
	 * @public
	 * @param {DriveBaseOption} opt
	 * @return {!Promise<DriveInfo>}
	 */
	this.getDrive = async function(opt){
		/** @type {DriveInfo} */
		var dat = {
			_trash: 0,
			_total: 0,
			_used: 0,
		};
		await this.operateItems(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.getAll();
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				b_evt.target.result.forEach(function(c_ele, c_idx){
					if(c_ele["type"] == ZbDrive.ITMTYP_FILE){
						dat._used += parseInt(c_ele["size"], 10);
					}
				});
			};
		});
		return dat;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveSearchItemsOption} opt
	 * @return {!Promise<Array<DriveItem>>}
	 */
	this.searchItems = async function(opt){
		return await this._searchItems(undefined, opt._parentid, opt._fname);
	};

	/**
	 * @override
	 * @public
	 * @param {DriveGetItemOption} opt
	 * @return {!Promise<?DriveItem>}
	 */
	this.getItem = async function(opt){
		/** @type {Array<DriveItem>} */
		var arr = await this._searchItems(opt._uid);
		if(arr && arr.length > 0){
			return arr[0];
		}else{
			return null;
		}
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
		/** @type {DriveItem} */
		var dat = {
			_id: "",
			_name: opt._folder,
			_size: 0,
			_parentId: "",
			_type: ZbDrive.ITMTYP_FOLDER,
		};
		if(opt._parentid){
			dat._parentId = opt._parentid;
		}

		dat._id = await this.fetchNextId(dat._parentId);
		await this.saveItem(dat);
		return dat;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveUpdateOption} opt
	 * @return {!Promise<number>}
	 */
	this.delete = async function(opt){
		/** @type {Array<DriveItem>} */
		var arr = [];
		/** @type {number} */
		var delsz = 0;

		/**
		 * @param {string} a_fid
		 */
		var markDelete = function(a_fid){
			/** @type {number} */
			var a_i = 0;
			for(a_i = 0; a_i < arr.length; a_i++){
				if(arr[a_i]._id == a_fid){
					arr[a_i]._delete = true;
				}else if(arr[a_i]._parentId == a_fid){
					if(arr[a_i]._type == ZbDrive.ITMTYP_FOLDER){
						markDelete(arr[a_i]._id);
					}else{
						arr[a_i]._delete = true;
					}
				}
			}
		};

		/**
		 * @param {IDBObjectStore} a_store
		 */
		var delItem = function(a_store){
			arr.forEach(function(b_ele){
				if(b_ele._delete){
					a_store.delete(b_ele._id);
				}
			});
		};

		/**
		 * @param {IDBObjectStore} a_store
		 */
		var delData = function(a_store){
			/** @type {Array<string>} */
			var a_arr = [];
			arr.forEach(function(b_ele){
				if(b_ele._delete && b_ele._type == ZbDrive.ITMTYP_FILE){
					a_arr.push(b_ele._id);
				}
			});
			if(a_arr.indexOf(opt._fid) < 0){
				a_arr.push(opt._fid);
			}

			/** @type {IDBRequest} */
			var a_req = a_store.getAllKeys();
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				b_evt.target.result.forEach(function(c_ele){
					/** @type {number} */
					var c_i = c_ele.indexOf(":");
					if(a_arr.indexOf(c_ele.substring(0, c_i)) >= 0){
						a_store.delete(c_ele);
						delsz += parseInt(c_ele.substring(c_ele.indexOf("_", c_i + 1) + 1), 10);
					}
				});
			};
		};

		await this.operateItems(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.getAll();
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				b_evt.target.result.forEach(function(c_ele, c_idx){
					arr.push({
						_id: c_ele["key"],
						_name: "",
						_parentId: c_ele["pid"],
					});
				});
			};
		});

		markDelete(opt._fid);
		await this.operateItems(delItem);
		await this.operateDatas(delData);
		return delsz;
	};

	/**
	 * @override
	 * @public
	 * @param {DriveWriterOption} opt
	 * @return {IdxDbWriter}
	 */
	this.createWriter = function(opt){
		return new IdxDbWriter(opt, this);
	};

	/**
	 * @override
	 * @public
	 * @param {DriveWriterOption} opt
	 * @param {number} upSize
	 * @return {!Promise<string>}
	 */
	this.prepareWriter = async function(opt, upSize){
		/** @type {string} */
		var pid = "";
		if(opt._fldrId){
			pid = opt._fldrId;
		}
		return await this.fetchNextId(pid);
	};

	/**
	 * @override
	 * @public
	 * @param {XMLHttpRequest} ajax
	 * @return {number} Next write postion.
	 */
	this.getNextPosition = function(ajax){
		return ZbDrvWrtPos.UNKNOWN;
	};

	/**
	 * @override
	 * @public
	 * @param {string} upurl
	 * @param {function((boolean|DriveJsonRet), DriveJsonRet=)=} cb
	 */
	this.cancelUpload = function(upurl, cb){
		//TODO
	};

	/**
	 * @override
	 * @param {DriveReaderOption} opt
	 * @return {IdxDbReader}
	 */
	this.createReader = function(opt){
		return new IdxDbReader(opt, this);
	};

	/**
	 * @override
	 * @public
	 * @param {DriveReaderOption} opt
	 * @param {function(?DriveItem, DriveJsonRet)} func
	 */
	this.prepareReader = function(opt, func){
		this.getItem({
			_uid: opt._id,
			_doneFunc: function(a_ret, a_itm){
				func(a_itm, a_ret);
			},
		});
	};

	/**
	 * @override
	 * @protected
	 * @return {string}
	 */
	this.getAjaxBaseUrl = function(){
		return "";
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
		await this.operateItems(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.get(opt._fid);
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				/** @type {Object<string, string>} */
				var b_itm = b_evt.target.result;
				if(!b_itm){
					return;
				}
				/** @type {boolean} */
				var b_flg = false;
				if(opt._newname && b_itm["name"] != opt._newname){
					b_itm["name"] = opt._newname;
					b_flg = true;
				}
				if(opt._parentid && b_itm["pid"] != opt._parentid){
					b_itm["pid"] = opt._parentid;
					b_flg = true;
				}
				if(b_flg){
					a_store.put(b_itm);
				}
			};

		});
		return 0;
	};

	/**
	 * @public
	 * @param {DriveItem} itm
	 * @return {!Promise<void>}
	 */
	this.saveItem = async function(itm){
		itm._lastModifiedDateTime = this.getTimestamp();
		/** @type {Object<string, string>} */
		var itm2 = {
			"key": itm._id,
			"name": itm._name,
			"size": itm._size,
			"tms": itm._lastModifiedDateTime,
			"type": itm._type,
		};
		if(itm._parentId){
			itm2["pid"] = itm._parentId;
		}
		await this.operateItems(function(a_store){
			a_store.put(itm2);
		});
	};

	/**
	 * @public
	 * @param {string} id
	 * @param {number} idx
	 * @param {number} sz
	 * @param {string} data
	 * @return {!Promise<void>}
	 */
	this.saveData = async function(id, idx, sz, data){
		await this.operateDatas(function(a_store){
			a_store.put({
				"key": id + ":" + idx + "_" + sz,
				"data": data,
			});
		});
	};

	/**
	 * @public
	 * @param {string} id
	 * @return {!Promise<Array<IdxDbDataInfo>>}
	 */
	this.fetchDataInfos = async function(id, func){
		/** @type {Array<IdxDbDataInfo>} */
		var arrs = [];
		await this.operateDatas(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.getAllKeys();
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				b_evt.target.result.forEach(function(c_ele){
					/** @type {number} */
					var c_i = c_ele.indexOf(":");
					if(c_ele.substring(0, c_i) == id){
						/** @type {string} */
						var c_tmp = c_ele.substring(c_i + 1);
						c_i = c_tmp.indexOf("_");
						arrs.push({
							_id: c_ele,
							_idx: parseInt(c_tmp.substring(0, c_i), 10),
							_size: parseInt(c_tmp.substring(c_i + 1), 10),
						});
					}
				});
			};
		});
		return arrs;
	};

	/**
	 * @public
	 * @param {string} id
	 * @return {!Promise<string>}
	 */
	this.fetchData = async function(id){
		/** @type {string} */
		var dat = "";
		await this.operateDatas(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.get(id);
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				dat = b_evt.target.result["data"];
			};

		});
		return dat;
	};

	/**
	 * @private
	 * @param {function(string=)} func function(a_err){}
	 */
	this.checkDb = function(func){
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
		var request = window.indexedDB.open(ZbIdxDbDrive.DB_NAME);
		/**
		 * @param {Event} a_evt
		 */
		request.onerror = function(a_evt){
			if(func){
				func(msg);
			}else{
				throw new Error(msg);
			}
		}.bind(this);
		/**
		 * @param {Event} a_evt
		 */
		request.onupgradeneeded = function(a_evt){
			/** @type {IDBDatabase} */
			var a_db = a_evt.target.result;
			a_db.createObjectStore(ZbIdxDbDrive.ITEMS_NAME, {
				"keyPath": "key"
			});
			a_db.createObjectStore(ZbIdxDbDrive.DATAS_NAME, {
				"keyPath": "key"
			});
		}.bind(this);
		/**
		 * @param {Event} a_evt
		 */
		request.onsuccess = function(a_evt){
			/** @type {IDBDatabase} */
			var a_db = a_evt.target.result;
			a_db.close();
			if(func){
				func();
			}
		}.bind(this);
	};

	/**
	 * @private
	 * @param {function(!IDBObjectStore)=} datafunc function(a_store){}
	 * @return {!Promise<void>}
	 */
	this.operateItems = function(datafunc){
		return new Promise(function(resolve, reject){
			/** @type {IDBOpenDBRequest} */
			var request = window.indexedDB.open(ZbIdxDbDrive.DB_NAME);
			/**
			 * @param {Event} a_evt
			 */
			request.onsuccess = function(a_evt){
				/** @type {IDBDatabase} */
				var a_db = a_evt.target.result;
				/** @type {IDBTransaction} */
				var a_trans = a_db.transaction(ZbIdxDbDrive.ITEMS_NAME, "readwrite");
				/**
				 * @param {Event} b_evt
				 */
				a_trans.oncomplete = function(b_evt){
					a_db.close();
					resolve();
				}.bind(this);
				/** @type {!IDBObjectStore} */
				var a_store = a_trans.objectStore(ZbIdxDbDrive.ITEMS_NAME);
				if(datafunc){
					datafunc(a_store);
				}
			}.bind(this);
		});
	};

	/**
	 * @private
	 * @param {function(!IDBObjectStore)=} datafunc function(a_store){}
	 * @return {!Promise<void>}
	 */
	this.operateDatas = function(datafunc){
		return new Promise(function(resolve, reject){
			/** @type {IDBOpenDBRequest} */
			var request = window.indexedDB.open(ZbIdxDbDrive.DB_NAME);
			/**
			 * @param {Event} a_evt
			 */
			request.onsuccess = function(a_evt){
				/** @type {IDBDatabase} */
				var a_db = a_evt.target.result;
				/** @type {IDBTransaction} */
				var a_trans = a_db.transaction(ZbIdxDbDrive.DATAS_NAME, "readwrite");
				/**
				 * @param {Event} b_evt
				 */
				a_trans.oncomplete = function(b_evt){
					a_db.close();
					resolve();
				}.bind(this);
				/** @type {!IDBObjectStore} */
				var a_store = a_trans.objectStore(ZbIdxDbDrive.DATAS_NAME);
				if(datafunc){
					datafunc(a_store);
				}
			}.bind(this);
		}.bind(this));
	};

	/**
	 * @private
	 * @param {string=} _uid
	 * @param {string=} _parentid
	 * @param {string=} _fname
	 * @return {!Promise<Array<DriveItem>>}
	 */
	this._searchItems = async function(_uid, _parentid, _fname){
		/** @type {Array<DriveItem>} */
		var arr = [];
		await this.operateItems(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.getAll();
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				b_evt.target.result.forEach(function(c_ele){
					/** @type {boolean} */
					var c_flg = true;
					if(_uid){
						c_flg = (_uid == c_ele["key"]);
					}
					if(c_flg && _parentid){
						c_flg = (_parentid == c_ele["pid"]);
					}
					if(c_flg && _fname){
						c_flg = (_fname == c_ele["name"]);
					}
					if(c_flg){
						arr.push({
							_id: c_ele["key"],
							_name: c_ele["name"],
							_size: c_ele["size"],
							_lastModifiedDateTime: c_ele["tms"],
							_type: c_ele["type"],
							_parentId: c_ele["pid"],
						});
					}
				});
			};
			
		});
		return arr;
	};

	/**
	 * @private
	 * @param {Date=} dt
	 * @return {string}
	 */
	this.getTimestamp = function(dt){
		if(!dt){
			dt = new Date();
		}
		/** @type {Array<number>} */
		var ymd = new Array();
		/** @type {Array<string>} */
		var hms = new Array();
		ymd.push(dt.getFullYear());
		ymd.push(dt.getMonth()+1);
		ymd.push(dt.getDate());
		hms.push("0".concat(dt.getHours()).slice(-2));
		hms.push("0".concat(dt.getMinutes()).slice(-2));
		hms.push("0".concat(dt.getSeconds()).slice(-2));
		return ymd.join("-") + " " + hms.join(":");
	};

	/**
	 * @private
	 * @param {string} parentId
	 * @return {!Promise<string>}
	 */
	this.fetchNextId = async function(parentId){
		/** @type {number} */
		var idx = -1;
		await this.operateItems(function(a_store){
			/** @type {IDBRequest} */
			var a_req = a_store.getAllKeys();
			/**
			 * @param {Event} b_evt
			 */
			a_req.onsuccess = function(b_evt){
				b_evt.target.result.forEach(function(c_ele, c_idx){
					/** @type {number} */
					var c_i = c_ele.indexOf("_");
					if(parentId && c_i > 0){
						if(c_ele.substring(c_i + 1) == parentId){
							c_i = parseInt(c_ele.substring(0, c_i), 10);
							if(c_i > idx){
								idx = c_i;
							}
						}
					}else if(!parentId && c_i < 0){
						c_i = parseInt(c_ele, 10);
						if(c_i > idx){
							idx = c_i;
						}
					}
				});
			};
		});
		idx++;
		if(parentId){
			return idx + "_" + parentId;
		}else{
			return idx.toString();
		}
	};
}

/** @const {string} */
ZbIdxDbDrive.DriveId = "idxdb";
/** @const {string} */
ZbIdxDbDrive.DB_NAME = "zgalocaldb";
/** @const {string} */
ZbIdxDbDrive.ITEMS_NAME = "items";
/** @const {string} */
ZbIdxDbDrive.DATAS_NAME = "datas";
ZbDrive.addDefine(ZbIdxDbDrive.DriveId, "Loacal Indexed DB", ZbIdxDbDrive);

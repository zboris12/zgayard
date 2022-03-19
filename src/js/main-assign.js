/** @define {string} */
const WORKER_PATH = "js/";

/** @const {boolean} @suppress {suspiciousCode} */
const USE_WORKER = (true && window.Worker) ? true: false;
/** @type {?Worker} */
var g_worker = null;

/**
 * @constructor
 * @param {DriveItem} fldr
 */
function ZbFolder(fldr){
	/** @private @type {DriveItem} */
	this.fldr = fldr;
	/** @private @type {Array<ZbFolder>} */
	this.childs = [];

	/**
	 * @public
	 * @return {string}
	 */
	this.getId = function(){
		return this.fldr._id;
	};

	/**
	 * @public
	 * @param {DriveItem} fldr
	 * @return {boolean}
	 */
	this.isMe = function(fldr){
		return this.fldr._id == fldr._id;
	};

	/**
	 * @public
	 * @param {string} fnm
	 * @return {boolean}
	 */
	this.isSameName = function(fnm){
		return this.fldr._name == fnm;
	};

	/**
	 * @public
	 * @param {string} fnm
	 * @return {?ZbFolder}
	 */
	this.getChild = function(fnm){
		/** @type {number} */
		var i = 0;
		for(i=0; i<this.childs.length; i++){
			if(this.childs[i].isSameName(fnm)){
				return this.childs[i];
			}
		}
		return null;
	};

	/**
	 * @public
	 * @param {DriveItem} fldr
	 * @return {ZbFolder}
	 */
	this.addChild = function(fldr){
		/** @type {number} */
		var i = 0;
		for(i=0; i<this.childs.length; i++){
			if(this.childs[i].isMe(fldr)){
				return this.childs[i];
			}
		}
		/** @type {ZbFolder} */
		var chd = new ZbFolder(fldr);
		this.childs.push(chd);
		return chd;
	};
}
/** @type {?ZbFolder} */
var g_folders = null;

/**
 * Event called from html
 */
function cancel(){
	var ele = /** @type {Element} */(getElement());
	ele.disabled = true;
	if(g_worker){
		/** @type {Element} */
		var tr = findParent(ele, "TR");
		/** @type {WorkerInfo} */
		var wkinf = {
			_type: WorkerInfoType.CANCEL,
			_rowIdx: parseInt(tr.getAttribute("rowIdx"), 10),
		};
		g_worker.postMessage(wkinf);
	}else{
		ele.setAttribute("canceled", "1");
	}
}

/**
 * Event called from html
 */
function hideQueueRows(){
	/** @type {?TableBody} */
	var t = getTableBody("#tblQueue");
	/** @type {Element} */
	var tbl = t._table;
	/** @type {Element} */
	var tbdy = t._tbody;
	/** @type {boolean} */
	var remian = false;
	/** @type {number} */
	var i = 0;
	for(i=0; i<tbdy.rows.length; i++){
		if(tbdy.rows[i].getAttribute("end")){
			hideElement(tbdy.rows[i]);
		}else{
			remian = true;
		}
	}
	if(!remian){
		hideElement(tbl);
	}
}

/**
 * @param {Element} tbdy
 * @param {number} idx row index
 * @param {string} nm name
 */
function addQueueRow(tbdy, idx, nm){
	/** @type {Element} */
	var tr = document.createElement("tr");
	/** @type {Element} */
	var td = document.createElement("td");
	/** @type {Element} */
	var span = document.createElement("span");
	/** @type {Element} */
	var btn = document.createElement("input");
	td.innerText = nm;
	tr.appendChild(td);
	td = document.createElement("td");
	span.innerText = window["msgs"]["waiting"];
	td.appendChild(span);
	tr.appendChild(td);
	td = document.createElement("td");
	btn.type = "button";
	btn.value = window["msgs"]["btnCancel"];
	btn.style.display = "none";
	btn.addEventListener("click", cancel);
	td.appendChild(btn);
	tr.appendChild(td);
	tr.setAttribute("rowIdx", idx);
	tbdy.appendChild(tr);
}

/**
 * @param {Element} ele table body or span
 * @param {number} idx row index if idx < 0 then ele is span, else ele is table body
 * @param {string} msg message
 */
function setSpanMessage(ele, idx, msg){
	/** @type {Element} */
	var span = ele;
	if(idx >= 0){
		span = ele.rows[idx].getElementsByTagName("span")[0];
	}
	span.innerText = msg;
}

/**
 * @param {Element} ele table body or button
 * @param {number} idx row index if idx < 0 then ele is button, else ele is table body
 */
function hideCancelButton(ele, idx){
	/** @type {Element} */
	var btn = ele;
	if(idx >= 0){
		btn = ele.rows[idx].getElementsByTagName("input")[0];
		ele.rows[idx].setAttribute("end", "1");
	}else{
		/** @type {Element} */
		var row = findParent(ele, "TR");
		if(row){
			row.setAttribute("end", "1");
		}
	}
	btn.style.display = "none";
	if(window.gc){
		window.gc();
	}
}
/**
 * @param {Element} tbdy
 * @param {WorkerStepInfo} spinf
 * @return {boolean} single progress is finished or not.
 */
function handleProgress(tbdy, spinf){
	/** @type {boolean} */
	var ret = false;
	var rowIdx = /** @type {number} */(spinf._rowIdx);
	switch(spinf._type){
	case StepInfoType.BEGIN:
		/** @type {Element} */
		var span = tbdy.rows[rowIdx].getElementsByTagName("span")[0];
		/** @type {Element} */
		var btn = tbdy.rows[rowIdx].getElementsByTagName("input")[0];
		span.innerText = "0%";
		btn.style.display = "";
		break;
	case StepInfoType.INPROGRESS:
		setSpanMessage(tbdy, rowIdx, spinf._speed + " " + Math.round(spinf._pos * 100 / spinf._size) + "%");
		break;
	case StepInfoType.DONE:
		if(spinf._finished && g_worker){
			terminateWorker();
		}
		hideCancelButton(tbdy, rowIdx);
		if(spinf._err){
			setSpanMessage(tbdy, rowIdx, spinf._err);
		}else if(spinf._wtype == WorkerInfoType.DOWNLOAD){
			setSpanMessage(tbdy, rowIdx, window["msgs"]["downDone"]);
			if(spinf._blob){
				 /** @type {string} */
				var fnm = tbdy.rows[rowIdx].cells[0].innerText;
				downloadBlob(spinf._blob, fnm, document.getElementById("download"));
			}
		}else{
			setSpanMessage(tbdy, rowIdx, window["msgs"]["upDone"]);
		}
		ret = true;
		break;
	case StepInfoType.CANCELED:
		if(spinf._finished && g_worker){
			terminateWorker();
		}
		hideCancelButton(tbdy, rowIdx);
		if(spinf._wtype == WorkerInfoType.DOWNLOAD){
			setSpanMessage(tbdy, rowIdx, window["msgs"]["downCanceled"]);
		}else{
			setSpanMessage(tbdy, rowIdx, window["msgs"]["updCanceled"]);
		}
		ret = true;
		break;
	}
	return ret;
}

function terminateWorker(){
	/** @type {?Worker} */
	var a_worker = g_worker;
	g_worker = null;
	g_folders = null;
	a_worker.terminate();
	if(a_worker.hasUpd){
		listFolder(true);
	}
}
/**
 * @return {boolean}
 */
function isEncfname(){
	return g_conf[g_rootidx]["encfname"]?true:false;
}
/**
 * @param {WorkerInfo} wkinf
 */
function addWorkerQueue(wkinf){
	if(!g_worker){
		/** @type {?TableBody} */
		var t = getTableBody("#tblQueue");
		/** @type {Element} */
		var tbl = t._table;
		/** @type {Element} */
		var tbdy = t._tbody;

		g_worker = new Worker(WORKER_PATH+"worker.js");
		/** @type {WorkerCommonInfo} */
		g_worker.cominf = {
			_token: g_drive.getToken(),
			_iv: g_keycfg["iv"].toString(CryptoJS.enc.Base64url),
			_key: g_keycfg["key"].toString(CryptoJS.enc.Base64url),
			_drvnm: g_drive.getId(),
		};

		g_worker.addEventListener("message", function(a_evt){
			var a_spinf = /** @type {WorkerStepInfo} */(a_evt.data);
			handleProgress(tbdy, a_spinf);
		});
	}
	wkinf._cominf = g_worker.cominf;
	if(wkinf._type == WorkerInfoType.UPLOAD && !g_worker.hasUpd){
		g_worker.hasUpd = true;
	}
	g_worker.postMessage(wkinf);
}

/**
 * @param {Element} tbdy
 * @param {number} idx
 * @param {function()} func
 */
function doDownUp(tbdy, idx, func){
	/** @type {WorkerStepInfo} */
	var spinf = {
		_type: StepInfoType.BEGIN,
		_wtype: WorkerInfoType.DOWNLOAD,
		_size: 0,
		_rowIdx: idx,
	};
	handleProgress(tbdy, spinf);
	/** @type {Element} */
	var btn = tbdy.rows[idx].getElementsByTagName("input")[0];
	/** @type {ZbTransfer} */
	var tfr = new ZbTransfer(g_keycfg, /** @type {function():boolean} */(function(){
		if(btn.getAttribute("canceled")){
			return true;
		}else{
			return false;
		}
	}), /** @type {function(WorkerStepInfo)} */(function(b_spinf){
		b_spinf._rowIdx = idx;
		if(handleProgress(tbdy, b_spinf)){
			func();
		}
	}));
	return tfr;
}

/**
 * Event called from html
 * @param {Event|number=} typ
 */
function download(typ){
	showInfo();
	/** @type {Array<DriveItem>} */
	var files = new Array();
	switch(typ){
	case 1:
		/** @type {Element} */
		var tr1 = getTableBody("#tblFileDetail")._tbody.rows[0];
		files.push({
			_name: tr1.getElementsByTagName("span")[0].innerText,
			_id: tr1.getAttribute("uid"),
		});
		break;
	case 2:
		/** @type {Element} */
		var div = document.getElementById("divItemenu");
		files.push({
			_name: div.getAttribute("uname"),
			_id: div.getAttribute("uid"),
		});
		break;
	default:
		files = getMultiChecked(true);
		if(!files){
			return;
		}
	}

	/** @type {?TableBody} */
	var t = getTableBody("#tblQueue");
	/** @type {Element} */
	var tbl = t._table;
	/** @type {Element} */
	var tbdy = t._tbody;
//	tbdy.innerHTML = "";
	tbl.style.display = "block";
	/** @type {number} */
	var strow = tbdy.rows.length;
	/** @type {number} */
	var idx = strow;

	files.forEach(function(/** @type {DriveItem} */ a_ele){
		addQueueRow(tbdy, idx, a_ele._name);
		if(USE_WORKER){
			addWorkerQueue({
				_type: WorkerInfoType.DOWNLOAD,
				_rowIdx: idx,
				_downinf: {
					_targetId: a_ele._id,
				},
			});
		}
		idx++;
	});

	if(!USE_WORKER){
		/** @type {function(number)} */
		var downloadFile = function(a_idx){
			/** @type {ZbTransfer} */
			var a_tfr = doDownUp(tbdy, strow + a_idx, function(){
				a_idx++;
				if(a_idx < files.length){
					downloadFile(a_idx);
				}
			});
			a_tfr.downloadFile(g_drive, files[a_idx]._id);
		};
		downloadFile(0);
	}
}

/**
 * Event called from html
 * @param {number|Event|boolean} foderFlg
 */
function upload(foderFlg){
	showInfo();
	/** @type {?Array<File>} */
	var files = null;
	foderFlg = (foderFlg === 1);
	if(foderFlg){
		files = document.getElementById("upfolder").files;
	}else{
		files = document.getElementById("upfiles").files;
	}
	if(files.length <= 0){
		showError("noFiles");
		return;
	}
	/** @type {?TableBody} */
	var t = getTableBody("#tblQueue");
	/** @type {Element} */
	var tbl = t._table;
	/** @type {Element} */
	var tbdy = t._tbody;
//	tbdy.innerHTML = "";
	tbl.style.display = "block";
	/** @type {number} */
	var strow = tbdy.rows.length;
	/** @type {number} */
	var idx = strow;

	/** @type {Array<UploadTarget>} */
	var targets = new Array();
	for(var i = 0; i < files.length; i++){
		/** @type {string} */
		var fpath =  "";
		if(files[i].webkitRelativePath){
			fpath = files[i].webkitRelativePath;
		}else{
			fpath = files[i].name;
		}
		targets.push({
			_fpath: fpath,
			_file: files[i],
			_idx: idx,
		});

		addQueueRow(tbdy, idx, fpath);
		idx++;
	}

	/** @type {string} */
	var baseId = g_paths[g_paths.length - 1]._id;

	/** @type {number} */
	var i = 0;
	if(!g_folders){
		g_folders = new ZbFolder(g_paths[0]);
	}
	/** @type {ZbFolder} */
	var basefld = g_folders;
	for(i=1; i<g_paths.length; i++){
		basefld = basefld.addChild(g_paths[i]);
	}

	/** @type {function(number)} */
	var uploadFile = function(a_idx){
		/** @type {UploadTarget} */
		var a_ele = targets[a_idx];
		findFolderId(basefld, a_ele._fpath, function(b_err, b_fnm, b_ptid){
			if(b_err){
				setSpanMessage(tbdy, a_ele._idx, JSON.stringify(b_err));
				return;
			}

			if(USE_WORKER){
				addWorkerQueue({
					_type: WorkerInfoType.UPLOAD,
					_rowIdx: a_ele._idx,
					_upinf: {
						_fname: b_fnm,
						_file: a_ele._file,
						_parentId: /** @type {string} */(b_ptid),
					},
				});
				a_idx++;
				if(a_idx < files.length){
					uploadFile(a_idx);
				}

			}else{
				/** @type {ZbTransfer} */
				var b_tfr = doDownUp(tbdy, strow + a_idx, function(){
					a_idx++;
					if(a_idx < files.length){
						uploadFile(a_idx);
					}else{
						listFolder(true);
					}
				});
				b_tfr.uploadFile(g_drive, b_fnm, a_ele._file, /** @type {string} */(b_ptid));
			}
		});
	};
	uploadFile(0);
}

/**
 * @param {ZbFolder} bsFldr Base folder
 * @param {string} fpath
 * @param {function((boolean|DriveJsonRet), string, string=)} func
 */
function findFolderId(bsFldr, fpath, func){
	/** @type {Array<string>} */
	var farr = fpath.split("/");
	/** @type {string} */
	var fnm = encryptFname(farr.pop());
	/** @type {ZbFolder} */
	var fldr = bsFldr;

	if(farr.length == 0){
		func(false, fnm, fldr.getId());
		return;
	}

	/** @type {boolean} */
	var newfld = false;
	/** @type {function(number)} */
	var getFolderId = function(a_idx){
		/** @type {string} */
		var a_orifnm = farr[a_idx];
		/** @type {string} */
		var a_fnm = encryptFname(a_orifnm);

		/** @type {function(ZbFolder)} */
		var a_doNext = function(b_fldr){
			fldr = b_fldr;
			a_idx++;
			if(a_idx < farr.length){
				getFolderId(a_idx);
			}else{
				func(false, fnm, fldr.getId());
			}
		};

		if(newfld){
			/** @type {DriveNewFolderOption} */
			var b_opt = {
				_folder: a_fnm,
				_parentid: fldr.getId(),
				_doneFunc: /** @type {function((boolean|DriveJsonRet), DriveItem=)} */(function(c_err, c_itm){
					if(c_err){
						func(c_err, fnm);
					}else{
						c_itm._name = a_orifnm;
						a_doNext(fldr.addChild(c_itm));
					}
				}),
			};
			g_drive.newFolder(b_opt);
			return;
		}

		/** @type {ZbFolder} */
		var a_fldr = fldr.getChild(a_orifnm);
		if(a_fldr){
			a_doNext(a_fldr);
			return;
		}

		/** @type {DriveSearchItemsOption} */
		var a_opt = {
			_fname: a_fnm,
			_parentid: fldr.getId(),
			_doneFunc: /** @type {function((boolean|DriveJsonRet), Array<DriveItem>=)} */(function(b_err, b_lst){
				if(b_err){
					func(b_err, fnm);
				}else if(b_lst.length == 0){
					newfld = true;
					getFolderId(a_idx);
				}else{
					b_lst[0]._name = a_orifnm;
					a_doNext(fldr.addChild(b_lst[0]));
				}
			}),
		};
		g_drive.searchItems(a_opt);
	};
	getFolderId(0);
}

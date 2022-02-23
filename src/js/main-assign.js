/** @define {string} */
const WORKER_PATH = "js/";

/** @const {boolean} */
const USE_WORKER = (true && window.Worker) ? true: false;
/** @type {?Worker} */
var g_worker = null;

/**
 * Event called from html
 */
function cancel(){
	var ele = /** @type {Element} */(getElement());
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
 * @param {Element} ele
 * @param {number} idx
 * @param {number} sz size
 * @param {string=} spd speed
 * @param {number=} pos position
 */
function showStepInfo(ele, idx, sz, spd, pos){
	setSpanMessage(ele, idx, spd + " " + Math.round(pos * 100 / sz) + "%");
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
}

function terminateWorker(){
	/** @type {?Worker} */
	var a_worker = g_worker;
	g_worker = null;
	a_worker.terminate();
	if(a_worker.hasUpd){
		listFolder(true);
	}
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
			_encfname: g_conf[g_rootidx]["encfname"]?true:false,
		};

		g_worker.addEventListener("message", function(a_evt){
			var a_spinf = /** @type {WorkerStepInfo} */(a_evt.data);
			var a_rowIdx = /** @type {number} */(a_spinf._rowIdx);
			switch(a_spinf._type){
			case StepInfoType.BEGIN:
				/** @type {Element} */
				var a_span = tbdy.rows[a_rowIdx].getElementsByTagName("span")[0];
				/** @type {Element} */
				var a_btn = tbdy.rows[a_rowIdx].getElementsByTagName("input")[0];
				a_span.innerText = "-";
				a_btn.style.display = "";
				break;
			case StepInfoType.INPROGRESS:
				showStepInfo(tbdy, a_rowIdx, a_spinf._size, a_spinf._speed, a_spinf._pos);
				break;
			case StepInfoType.DONE:
				if(a_spinf._finished){
					terminateWorker();
				}
				hideCancelButton(tbdy, a_rowIdx);
				if(a_spinf._err){
					setSpanMessage(tbdy, a_rowIdx, a_spinf._err);
				}else if(a_spinf._wtype == WorkerInfoType.DOWNLOAD){
					setSpanMessage(tbdy, a_rowIdx, window["msgs"]["downDone"]);
					if(a_spinf._blob){
						 /** @type {string} */
						var a_fnm = tbdy.rows[a_rowIdx].cells[0].innerText;
						downloadBlob(a_spinf._blob, a_fnm, document.getElementById("download"));
					}
				}else{
					setSpanMessage(tbdy, a_rowIdx, window["msgs"]["upDone"]);
				}
				break;
			case StepInfoType.CANCELED:
				if(a_spinf._finished){
					terminateWorker();
				}
				hideCancelButton(tbdy, a_rowIdx);
				if(a_spinf._wtype == WorkerInfoType.DOWNLOAD){
					setSpanMessage(tbdy, a_rowIdx, window["msgs"]["downCanceled"]);
				}else{
					setSpanMessage(tbdy, a_rowIdx, window["msgs"]["updCanceled"]);
				}
				break;
			}
		});
	}
	wkinf._cominf = g_worker.cominf;
	if(wkinf._type == WorkerInfoType.UPLOAD && !g_worker.hasUpd){
		g_worker.hasUpd = true;
	}
	g_worker.postMessage(wkinf);
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
	var idx = tbdy.rows.length;

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
		downloadFile(files, 0, tbdy);
	}
}
/**
 * @param {Array<DriveItem>} files
 * @param {number} idx
 * @param {Element} tbdy
 */
function downloadFile(files, idx, tbdy){
	/** @type {string} */
	var fnm = files[idx]._name;
	/** @type {Element} */
	var span = tbdy.rows[idx].getElementsByTagName("span")[0];
	/** @type {Element} */
	var btn = tbdy.rows[idx].getElementsByTagName("input")[0];
	span.innerText = "-";
	btn.style.display = "";
	/** @type {ZBReader} */
	var reader = g_drive.createReader({
		_id: files[idx]._id,
		_bufSize: 1600000,
	});
	/** @type {ZBlobWriter} */
	var writer = new ZBlobWriter(/** @type {ZBWriterOption} */({
		_downEle: document.getElementById("download"),
	}));
	/** @type {ZbCrypto} */
	var cypt = new ZbCrypto({
		_decrypt: true,
		_keycfg: g_keycfg,
		_reader: reader,
		_writer: writer,
	});
	/** @type {function():boolean} */
	cypt.onstep = function(){
		showStepInfo(span, -1, reader.getSize(), cypt.calSpeed(), reader.getPos());
		if(btn.getAttribute("canceled")){
			return false;
		}else{
			return true;
		}
	};
	cypt.onfinal = /** @type {function(*=, boolean=)} */(function(a_err, a_canceled){
		hideCancelButton(btn, -1);
		if(a_err){
			span.innerText = a_err.message || a_err.restxt;
		}else if(a_canceled){
			for(var i=idx; i<files.length; i++){
				tbdy.rows[i].getElementsByTagName("span")[0].innerText = window["msgs"]["downCanceled"];
			}
		}else{
			span.innerText = window["msgs"]["downDone"];
			writer.download(fnm);
			idx++;
			if(idx < files.length){
				downloadFile(files, idx, tbdy);
			}
		}
	});
	cypt.start();
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
	var idx = tbdy.rows.length;

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
	var basePath = "";
	/** @type {string} */
	var baseId = "";

	/** @type {function(number)} */
	var uploadFile = function(a_idx){
		/** @type {Array<string>} */
		var a_farr = targets[a_idx]._fpath.split("/");
		for(var a_i=0; a_i < a_farr.length; a_i++){
			a_farr[a_i] = encryptFname(a_farr[a_i]);
		}

		/** @type {Element} */
		var a_span = tbdy.rows[a_idx].getElementsByTagName("span")[0];
		/** @type {Element} */
		var a_btn = tbdy.rows[a_idx].getElementsByTagName("input")[0];
		a_span.innerText = "-";
		a_btn.style.display = "";
		/** @type {ZBlobReader} */
		var a_reader = new ZBlobReader({
			_blob: targets[a_idx]._file,
			_bufSize: 1600000,
		});
		/** @type {DriveWriterOption} */
		var a_wopt = {
			_fnm: a_farr[0],
			_fldrId: baseId,
		};
		if(a_farr.length > 1){
			a_wopt._fnm = a_farr.join("/");
			a_wopt._fldr = basePath;
		}
		/** @type {ZBWriter} */
		var a_writer = g_drive.createWriter(a_wopt);
		/** @type {ZbCrypto} */
		var a_cypt = new ZbCrypto({
			_keycfg: g_keycfg,
			_reader: a_reader,
			_writer: a_writer,
		});
		/** @type {function():boolean} */
		a_cypt.onstep = function(){
			showStepInfo(a_span, -1, a_reader.getSize(), a_cypt.calSpeed(), a_reader.getPos());
			if(a_btn.getAttribute("canceled")){
				return false;
			}else{
				return true;
			}
		};

		a_cypt.onfinal = /** @type {function(*=, boolean=)} */(function(b_err, b_canceled){
			hideCancelButton(a_btn, -1);
			if(b_err){
				a_span.innerText = b_err.message || b_err.restxt;
			}else if(b_canceled){
				for(var b_i=a_idx; b_i<targets.length; b_i++){
					tbdy.rows[b_i].getElementsByTagName("span")[0].innerText = window["msgs"]["updCanceled"];
				}
				if(a_idx > 0){
					listFolder(true);
				}
			}else{
				a_span.innerText = window["msgs"]["upDone"];
				addQuotaUsed(a_writer.getTotalSize());
				a_idx++;
				if(a_idx < targets.length){
					uploadFile(a_idx);
				}else{
					listFolder(true);
				}
			}
		});
		a_cypt.start();
	};

	/** @type {function()} */
	var startUpload = function(){
		if(USE_WORKER){
			targets.forEach(function(/** @type {UploadTarget} */ a_ele){
				addWorkerQueue({
					_type: WorkerInfoType.UPLOAD,
					_rowIdx: a_ele._idx,
					_upinf: {
						_fpath: a_ele._fpath,
						_file: a_ele._file,
						_baseId: baseId,
						_basePath: basePath,
					},
				});
			});
		}else{
			uploadFile(0);
		}
	};

	if(foderFlg){
		// Get current folder's path
		g_drive.getItem({
			/** @type {string} */
			_uid: g_paths[g_paths.length - 1]._id,
			/** @type {function((boolean|DriveJsonRet), DriveItem=)} */
			_doneFunc: function(a_err, a_dat){
				basePath = a_dat._parent.concat("/").concat(a_dat._name);
				baseId = a_dat._id;
				startUpload();
			},
		});
	}else{
		baseId = g_paths[g_paths.length - 1]._id;
		startUpload();
	}
}

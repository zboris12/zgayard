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
 * Get items in list.
 *
 * @param {Element} ul
 * @param {function(Element):number=} func
 *  A function called to check the element is target or not.
 *  The return value means 1: not target, 2: target, -1: not target and stop loop, -2: target and stop loop.
 * @return {Array<Element>} items
 */
function getListItems(ul, func){
	/** @type {number} */
	var i = 0;
	/** @type {Array<Element>} */
	var eles = [];
	/** @type {!NodeList<!Element>} */
	var eles2 = ul.getElementsByTagName("li");
	for(i=0; i<eles2.length; i++){
		/** @type {Element} */
		var ele = eles2[i];
		if(!(ele.classList.contains("header") || ele.classList.contains("template"))){
			if(func){
				/** @type {number} */
				var j = func(ele);
				if(j == 2 || j == -2){
					eles.push(ele);
				}
				if(j < 0){
					break;
				}
			}else{
				eles.push(ele);
			}
		}
	}
	return eles;
}

/**
 * Event called from html
 * @param {Event} evt
 */
function cancel(evt){
	/** @type {Element} */
	var ele = getElement(evt);
	hideElement(ele);
	if(g_worker){
		/** @type {Element} */
		var li = findParent("li", ele);
		/** @type {WorkerInfo} */
		var wkinf = {
			_type: WorkerInfoType.CANCEL,
			_rowIdx: getIntAttr(li, "rowIdx"),
		};
		g_worker.postMessage(wkinf);
	}else{
		ele.setAttribute("canceled", "1");
	}
}

/**
 * @param {number} ftyp Finished task's type. 1: successfully, 2: canceled, 3: error occured.
 * @param {Element=} qb
 * @param {number=} allcnt Count of all tasks.
 */
function addQbFinished(ftyp, qb, allcnt){
	/** @type {number} */
	var finished = 0;
	/** @type {number} */
	var stoped = 0;
	if(!qb){
		qb = getElement(".zb-qbutton");
	}
	if(!allcnt && qb.hasAttribute("count")){
		allcnt = getIntAttr(qb, "count");
	}
	if(qb.hasAttribute("fincount")){
		finished = getIntAttr(qb, "fincount");
	}
	if(qb.hasAttribute("stopcount")){
		stoped = getIntAttr(qb, "stopcount");
	}

	switch(ftyp){
	case 1:
		finished++;
		qb.setAttribute("fincount", finished);
		break;
	case 3:
		qb.setAttribute("haserr", "1");
	case 2:
		stoped++;
		qb.setAttribute("stopcount", stoped);
		break;
	}

	if(allcnt > 0){
		getElement("div", qb).style.width = Math.floor(finished * 100 / allcnt) + "%";
	}else{
		getElement("div", qb).style.width = "0%";
	}
	if(allcnt == finished + stoped){
		if(qb.hasAttribute("haserr")){
			qb.classList.add("error");
		}else{
			qb.classList.add("done");
		}
	}
}
/**
 * @param {number} cnt
 */
function showQbutton(cnt){
	/** @type {Element} */
	var qb = getElement(".zb-qbutton");
	/** @type {number} */
	var allcnt = 0;
	if(qb.hasAttribute("count")){
		allcnt = getIntAttr(qb, "count");
	}
	allcnt += cnt;
	qb.setAttribute("count", allcnt);
	addQbFinished(0, qb, allcnt);
	if(qb.classList.contains("error")){
		qb.classList.remove("error");
	}
	if(qb.classList.contains("done")){
		qb.classList.remove("done");
	}
	showElement(qb);
}
/**
 * Event called from html
 * @param {Event} evt
 */
function hideQueue(evt){
	/** @type {Element} */
	var div = findParent(".zb-queue", getElement(evt));
	/** @type {Element} */
	var qb = getElement(".zb-qbutton");
	div.style.top = "100%";
	if(qb.classList.contains("done") || qb.classList.contains("error")){
		hideElement(qb);
		qb.removeAttribute("count");
		qb.removeAttribute("fincount");
		qb.removeAttribute("stopcount");
		qb.removeAttribute("haserr");

		/** @type {Element} */
		var ul = getElement("ul", div);
		/** @type {Array<Element>} */
		var eles = getListItems(ul);
		/** @type {number} */
		var i = 0;
		for(i=eles.length - 1; i>=0; i--){
			ul.removeChild(eles[i]);
		}
		ul.removeAttribute("rowCount");
	}
}

/**
 * @param {Element} ul
 * @param {string} nm name
 * @param {boolean=} downFl Is download or upload
 * @return {Element} li
 */
function addQueueRow(ul, nm, downFl){
	/** @type {number} */
	var idx = 0;
	if(ul.hasAttribute("rowCount")){
		idx = getIntAttr(ul, "rowCount");
	}
	/** @type {Element} */
	var l = getElement("template", ul, "li.class").cloneNode(true);
	l.classList.remove("template");
	l.setAttribute("rowIdx", idx);
	if(downFl){
		l.setAttribute("downFl", 1);
	}
	ul.setAttribute("rowCount", idx + 1);

	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("span", l);
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		/** @type {Element} */
		var sp = eles[i];
		switch(sp.getAttribute("name")){
		case "cancel":
			sp.addEventListener("click", cancel);
			break;
		case "icon":
			/** @type {Element} */
			var lbl = getElement("label", sp);
			lbl.innerText = nm;
			if(downFl){
				setSvgImage(sp, "download");
			}else{
				setSvgImage(sp, "upload");
			}
			break;
		case "elTime":
			previousElement(sp, "label").innerText = window["msgs"]["elTime"];
			break;
		case "esTime":
			previousElement(sp, "label").innerText = window["msgs"]["esTime"];
			break;
		case "speed":
			sp.innerText = window["msgs"]["waiting"];
			break;
		}
	}

	ul.appendChild(l);
	return l;
}

/**
 * @param {number} idx
 * @param {Element=} ul
 * @return {Element}
 */
function getTargetLi(idx, ul){
	if(!ul){
		ul = getElement("ul", "#divQueue");
	}
	/** @type {Array<Element>} */
	var eles = getListItems(ul, function(a_ele){
		if(a_ele.getAttribute("rowIdx") == idx){
			return -2;
		}else{
			return 1;
		}
	});
	if(eles.length > 0){
		return eles[0];
	}else{
		return null;
	}
}

/**
 * @param {Element} li
 * @param {WorkerStepInfo} spinf
 * @return {Element} The span of icon
 */
function setProgressInfo(li, spinf){
	/** @type {Element} */
	var iconSpan = null;
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("span", li);
	/** @type {string} */
	var per = "";
	switch(spinf._type){
	case StepInfoType.BEGIN:
		per = "0%";
		break;
	case StepInfoType.INPROGRESS:
		per = Math.round(spinf._pos * 100 / spinf._size) + "%";
		break;
	case StepInfoType.DONE:
		per = "100%";
		break;
	}
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		/** @type {Element} */
		var sp = eles[i];
		switch(sp.getAttribute("name")){
		case "icon":
			iconSpan = sp;
			break;
		case "percent":
			switch(spinf._type){
			case StepInfoType.BEGIN:
			case StepInfoType.INPROGRESS:
				sp.innerText = per;
				break;
			case StepInfoType.DONE:
				if(!spinf._err){
					sp.innerText = per;
				}
				break;
			}
			break;
		case "elTime":
			switch(spinf._type){
			case StepInfoType.INPROGRESS:
			case StepInfoType.DONE:
			case StepInfoType.CANCELED:
				sp.innerText = getElapsedTime(/** @type {number} */(spinf._begin));
				break;
			}
			break;
		case "esTime":
			switch(spinf._type){
			case StepInfoType.INPROGRESS:
				sp.innerText = getTimeDisp(Math.round((spinf._size - spinf._pos) / spinf._speed));
				break;
			}
			break;
		case "speed":
			switch(spinf._type){
			case StepInfoType.INPROGRESS:
				sp.innerText = getSizeDisp(/** @type {number} */(spinf._speed)) + "/s";
				break;
			case StepInfoType.DONE:
			case StepInfoType.CANCELED:
				if(!spinf._err){
					li.classList.add("done");
					sp.innerText = window["msgs"]["avspeed"].replace("{0}", getSizeDisp(spinf._pos * 1000 / (Date.now() - spinf._begin)));
				}
				break;
			}
			break;
		case "cancel":
			switch(spinf._type){
			case StepInfoType.BEGIN:
				showElement(sp);
				break;
			case StepInfoType.DONE:
			case StepInfoType.CANCELED:
				/** @type {Element} */
				var svg = getElement("svg", sp);
				svg.removeChild(svg.firstElementChild);
				if(spinf._err || spinf._type == StepInfoType.CANCELED){
					setSvgImage(sp, "multi");
					addQbFinished(spinf._err ? 3 : 2);
				}else{
					setSvgImage(sp, "chkbox", undefined,"#10B981");
					addQbFinished(1);
				}
				showElement(sp);
				break;
			}
			break;
		default:
			/** @type {Element} */
			var div = findParent("div", sp);
			if(div && div.classList.contains("zb-progressbar")){
				switch(spinf._type){
				case StepInfoType.BEGIN:
				case StepInfoType.INPROGRESS:
					sp.style.width = per;
					break;
				case StepInfoType.DONE:
					if(spinf._err){
						li.classList.add("error");
						div.innerText = spinf._err;
					}else{
						sp.style.width = per;
					}
					break;
				}
			}
			break;
		}
	}
	return iconSpan;
}
/**
 * @param {WorkerStepInfo} spinf
 * @param {Element=} ul
 * @return {boolean} single progress is finished or not.
 */
function handleProgress(spinf, ul){
	var rowIdx = /** @type {number} */(spinf._rowIdx);
	/** @type {Element} */
	var li = getTargetLi(rowIdx, ul);
	return handleLiProgress(li, spinf);
}
/**
 * @param {Element} li
 * @param {WorkerStepInfo} spinf
 * @return {boolean} single progress is finished or not.
 */
function handleLiProgress(li, spinf){
	/** @type {boolean} */
	var ret = false;
	switch(spinf._type){
	case StepInfoType.BEGIN:
	case StepInfoType.INPROGRESS:
		setProgressInfo(li, spinf);
		break;
	case StepInfoType.DONE:
		if(spinf._finished && g_worker){
			terminateWorker();
		}
		/** @type {Element} */
		var sp = setProgressInfo(li, spinf);
		if(!spinf._err){
			if(spinf._wtype == WorkerInfoType.UPLOAD){
				addQuotaUsed(spinf._size);
			}else if(spinf._wtype == WorkerInfoType.DOWNLOAD && spinf._blob){
				 /** @type {string} */
				var fnm = getElement("label", sp).innerText;
				downloadBlob(spinf._blob, fnm, getElement("#lnkDown"));
			}
		}
		if(window.gc){
			window.gc();
		}
		ret = true;
		break;
	case StepInfoType.CANCELED:
		if(spinf._finished && g_worker){
			terminateWorker();
		}
		setProgressInfo(li, spinf);
		if(window.gc){
			window.gc();
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
			handleProgress(a_spinf);
		});
	}
	wkinf._cominf = g_worker.cominf;
	if(wkinf._type == WorkerInfoType.UPLOAD && !g_worker.hasUpd){
		g_worker.hasUpd = true;
	}
	g_worker.postMessage(wkinf);
}

/**
 * @param {Element} li
 * @param {function()} func
 * @return {ZbTransfer}
 */
function doDownUp(li, func){
	/** @type {number} */
	var idx = getIntAttr(li, "rowIdx");
	/** @type {Element} */
	var btn = getElement("cancel", li, "span.name");
	/** @type {ZbTransfer} */
	var tfr = new ZbTransfer(g_keycfg, /** @type {function():boolean} */(function(){
		if(btn.getAttribute("canceled")){
			return true;
		}else{
			return false;
		}
	}), /** @type {function(WorkerStepInfo)} */(function(b_spinf){
		b_spinf._rowIdx = idx;
		if(handleLiProgress(li, b_spinf)){
			func();
		}
	}));
	return tfr;
}

/**
 * @param {Array<DriveItem>} files
 */
function download(files){
	/** @type {Element} */
	var ul = getElement("ul", "#divQueue");
	/** @type {number} */
	var i = 0;

	showQbutton(files.length);
	for(i=0; i<files.length; i++){
		/** @type {Element} */
		var li = addQueueRow(ul, files[i]._name, true);
		if(USE_WORKER){
			addWorkerQueue({
				_type: WorkerInfoType.DOWNLOAD,
				_rowIdx: getIntAttr(li, "rowIdx"),
				_downinf: {
					_targetId: files[i]._id,
				},
			});
		}else{
			files[i]._parentId = li.getAttribute("rowIdx");
		}
	}

	if(!USE_WORKER){
		/** @type {function(number)} */
		var downloadFile = function(a_idx){
			/** @type {Element} */
			var a_li = getTargetLi(parseInt(files[a_idx]._parentId, 10), ul);
			/** @type {ZbTransfer} */
			var a_tfr = doDownUp(a_li, function(){
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
 *
 * @param {Array<File>} files
 */
function upload(files){
	/** @type {Element} */
	var ul = getElement("ul", "#divQueue");
	/** @type {Array<UploadTarget>} */
	var targets = new Array();
	/** @type {number} */
	var i = 0;

	showQbutton(files.length);
	for(i=0; i<files.length; i++){
		/** @type {string} */
		var fpath =  "";
		if(files[i].webkitRelativePath){
			fpath = files[i].webkitRelativePath;
		}else{
			fpath = files[i].name;
		}
		/** @type {Element} */
		var li = addQueueRow(ul, fpath);
		targets.push({
			_fpath: fpath,
			_file: files[i],
			_idx: getIntAttr(li, "rowIdx"),
		});
	}

	/** @type {string} */
	var baseId = g_paths[g_paths.length - 1]._id;

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
				handleProgress({
					_type: StepInfoType.DONE,
					_wtype: WorkerInfoType.UPLOAD,
					_rowIdx: a_ele._idx,
					_size: 0,
					_err: JSON.stringify(b_err),
				}, ul);
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
				if(a_idx < targets.length){
					uploadFile(a_idx);
				}

			}else{
				/** @type {Element} */
				var b_li = getTargetLi(a_ele._idx, ul);
				/** @type {ZbTransfer} */
				var b_tfr = doDownUp(b_li, function(){
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

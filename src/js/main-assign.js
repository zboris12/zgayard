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
			type: WorkerInfoType.CANCEL,
			rowIdx: getIntAttr(li, "rowIdx"),
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
 * @param {WorkerInfoType} tpy
 * @param {boolean=} beginFlg
 */
function animQbutton(tpy, beginFlg){
	/** @type {number} */
	var idx = 0;
	if(tpy == WorkerInfoType.DOWNLOAD){
		idx = 1;
	}else if(tpy != WorkerInfoType.UPLOAD){
		return;
	}

	/** @type {Element} */
	var ele = getElementsByAttribute("svg", ".zb-qbutton")[idx];
	if(beginFlg){
		ele.classList.add("pulse");
	}else{
		ele.classList.remove("pulse");
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
	switch(spinf.type){
	case StepInfoType.BEGIN:
		per = "0%";
		animQbutton(spinf.wtype, true);
		break;
	case StepInfoType.INPROGRESS:
		per = Math.round(spinf.posn * 100 / spinf.size) + "%";
		break;
	case StepInfoType.DONE:
		per = "100%";
	case StepInfoType.CANCELED:
		animQbutton(spinf.wtype);
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
			switch(spinf.type){
			case StepInfoType.BEGIN:
			case StepInfoType.INPROGRESS:
				sp.innerText = per;
				break;
			case StepInfoType.DONE:
				if(!spinf.errr){
					sp.innerText = per;
				}
				break;
			}
			break;
		case "elTime":
			switch(spinf.type){
			case StepInfoType.INPROGRESS:
			case StepInfoType.DONE:
			case StepInfoType.CANCELED:
				sp.innerText = getElapsedTime(/** @type {number} */(spinf.begin));
				break;
			}
			break;
		case "esTime":
			switch(spinf.type){
			case StepInfoType.INPROGRESS:
				sp.innerText = getTimeDisp(Math.round((spinf.size - spinf.posn) / spinf.spd));
				break;
			}
			break;
		case "speed":
			switch(spinf.type){
			case StepInfoType.INPROGRESS:
				sp.innerText = getSizeDisp(/** @type {number} */(spinf.spd)) + "/s";
				break;
			case StepInfoType.DONE:
			case StepInfoType.CANCELED:
				if(!spinf.errr){
					li.classList.add("done");
					sp.innerText = window["msgs"]["avspeed"].replace("{0}", getSizeDisp(spinf.posn * 1000 / (Date.now() - spinf.begin)));
				}
				break;
			}
			break;
		case "cancel":
			switch(spinf.type){
			case StepInfoType.BEGIN:
				showElement(sp);
				break;
			case StepInfoType.DONE:
			case StepInfoType.CANCELED:
				/** @type {Element} */
				var svg = getElement("svg", sp);
				svg.removeChild(svg.firstElementChild);
				if(spinf.errr || spinf.type == StepInfoType.CANCELED){
					setSvgImage(sp, "multi");
					addQbFinished(spinf.errr ? 3 : 2);
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
				switch(spinf.type){
				case StepInfoType.BEGIN:
				case StepInfoType.INPROGRESS:
					sp.style.width = per;
					break;
				case StepInfoType.DONE:
					if(spinf.errr){
						li.classList.add("error");
						div.innerText = spinf.errr;
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
	var r = /** @type {number} */(spinf.rowIdx);
	/** @type {Element} */
	var li = getTargetLi(r, ul);
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
	switch(spinf.type){
	case StepInfoType.BEGIN:
	case StepInfoType.INPROGRESS:
		setProgressInfo(li, spinf);
		break;
	case StepInfoType.DONE:
		if(spinf.fined && g_worker){
			terminateWorker();
		}
		/** @type {Element} */
		var sp = setProgressInfo(li, spinf);
		if(!spinf.errr){
			if(spinf.wtype == WorkerInfoType.UPLOAD){
				addQuotaUsed(spinf.size);
			}else if(spinf.wtype == WorkerInfoType.DOWNLOAD && spinf.blob){
				 /** @type {string} */
				var fnm = getElement("label", sp).innerText;
				downloadBlob(spinf.blob, fnm, getElement("#lnkDown"));
			}
		}
		if(window.gc){
			window.gc();
		}
		ret = true;
		break;
	case StepInfoType.CANCELED:
		if(spinf.fined && g_worker){
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
		g_worker.cinf = {
			gtoken: g_drive.getToken(),
			iv: rawToBase64url(g_keycfg.iv),
			key: rawToBase64url(g_keycfg.key),
			drvid: g_drive.getId(),
			encfname: isEncfname(),
		};

		g_worker.addEventListener("message", function(a_evt){
			var a_spinf = /** @type {WorkerStepInfo} */(a_evt.data);
			handleProgress(a_spinf);
		});
	}
	wkinf.cominf = g_worker.cinf;
	if(wkinf.type == WorkerInfoType.UPLOAD && !g_worker.hasUpd){
		g_worker.hasUpd = true;
	}
	g_worker.postMessage(wkinf);
}

/**
 * @param {Element} li
 * @return {ZbTransfer}
 */
function doDownUp(li){
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
		b_spinf.rowIdx = idx;
		handleLiProgress(li, b_spinf);
	}));
	return tfr;
}

/**
 * @param {Array<DriveItem>} files
 * @return {!Promise<void>}
 */
async function download(files){
	// if(g_swReady && files.length == 1){
		// /** @type {Element} */
		// var lnk = getElement("#lnkDown");
		// lnk.download = files[0]._name;
		// lnk.href = g_SWPATH + files[0]._id;
		// lnk.click();
		// return;
	// }

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
				type: WorkerInfoType.DOWNLOAD,
				rowIdx: getIntAttr(li, "rowIdx"),
				downinf: {
					targetId: files[i]._id,
				},
			});
		}else{
			files[i]._parentId = li.getAttribute("rowIdx");
		}
	}

	if(!USE_WORKER){
		/** @type {number} */
		var a_idx = 0;
		while(a_idx < files.length){
			/** @type {Element} */
			var a_li = getTargetLi(parseInt(files[a_idx]._parentId, 10), ul);
			/** @type {ZbTransfer} */
			var a_tfr = doDownUp(a_li);
			await a_tfr.downloadFile(g_drive, files[a_idx]._id);
			a_idx++;
		}
	}
}

/**
 * Event called from html
 *
 * @param {Array<File>} files
 * @return {!Promise<void>}
 */
async function upload(files){
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

	/** @type {number} */
	var a_idx = 0;
	while(a_idx < targets.length){
		/** @type {UploadTarget} */
		var a_ele = targets[a_idx];
		/** @type {DriveWriterOption} */
		var a_dwopt = await findFolderId(basefld, a_ele._fpath);
		a_idx++;
		if(USE_WORKER){
			addWorkerQueue({
				type: WorkerInfoType.UPLOAD,
				rowIdx: a_ele._idx,
				upinf: {
					fname: a_dwopt._fnm,
					file: a_ele._file,
					ptid: /** @type {string} */(a_dwopt._fldrId),
				},
			});
		}else{
			/** @type {Element} */
			var b_li = getTargetLi(a_ele._idx, ul);
			/** @type {ZbTransfer} */
			var b_tfr = doDownUp(b_li);
			await b_tfr.uploadFile(g_drive, a_dwopt._fnm, a_ele._file, /** @type {string} */(a_dwopt._fldrId));
		}
	}
	if(!USE_WORKER){
		listFolder(true);
	}
}

/**
 * @param {ZbFolder} bsFldr Base folder
 * @param {string} fpath
 * @return {!Promise<DriveWriterOption>}
 */
async function findFolderId(bsFldr, fpath){
	/** @type {Array<string>} */
	var farr = fpath.split("/");
	/** @type {string} */
	var fnm = encryptFname(farr.pop());
	/** @type {ZbFolder} */
	var fldr = bsFldr;

	if(farr.length == 0){
		return {
			_fnm: fnm,
			_fldrId: fldr.getId(),
		};
	}

	/** @type {number} */
	var a_idx = 0;
	while(a_idx < farr.length){
		/** @type {string} */
		var a_orifnm = farr[a_idx];
		/** @type {string} */
		var a_fnm = encryptFname(a_orifnm);
		a_idx++;

		/** @type {ZbFolder} */
		var a_fldr = fldr.getChild(a_orifnm);
		if(a_fldr){
			fldr = a_fldr;
			continue;
		}

		/** @type {DriveSearchItemsOption} */
		var a_opt = {
			_fname: a_fnm,
			_parentid: fldr.getId(),
		};
		/** @type {Array<DriveItem>} */
		var b_lst = await g_drive.searchItems(a_opt);
		if(b_lst.length == 0){
			/** @type {DriveNewFolderOption} */
			var b_opt = {
				_folder: a_fnm,
				_parentid: fldr.getId(),
			};
			/** @type {DriveItem} */
			var b_itm = await g_drive.newFolder(b_opt);
			b_itm._name = a_orifnm;
			fldr = fldr.addChild(b_itm);
		}else{
			b_lst[0]._name = a_orifnm;
			fldr = fldr.addChild(b_lst[0]);
		}
	}
	return {
		_fnm: fnm,
		_fldrId: fldr.getId(),
	};
}

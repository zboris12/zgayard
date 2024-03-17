/**
 * @enum {number}
 */
const MenuType = {
	NAV: 1,
	MAIN: 2,
	ITEM: 3,
	TEXT: 4,
};

/**
 * @param {string} typ
 * @return {!Promise<void>}
 */
function showModal(typ){
	return new Promise(function(resolve, reject){
		/** @type {string} */
		var ttl = "";
		switch(typ){
		case "new":
			ttl = "spanNew";
			break;
		case "upload":
			ttl = "spanUpload";
			break;
		case "selfldr":
			ttl = "spanSelFldr";
			break;
		default:
			return;
		}
		/** @type {Element} */
		var div = getElement("#divModal");
		/** @type {Element} */
		var ele = getElement("#spanModal");
		ele.innerText = window["msgs"][ttl];
		/** @type {Array<Element>} */
		var eles = getElementsByAttribute("div", nextElement(ele));
		/** @type {number} */
		var i = 0;
		for(i=0; i<eles.length; i++){
			ele = eles[i];
			if(ele.hasAttribute("type")){
				if(ele.getAttribute("type") == typ){
					showElement(ele);
				}else{
					hideElement(ele);
				}
			}
		}

		div.presv = resolve;
		div.prejt = reject;
		showElement(div);
	});
}
/**
 * Call from html event.
 *
 * @param {Event} evt
 */
function hideModal(evt){
	/** @type {Element} */
	var div = findParent("zb-modal", getElement(evt), "div.class");
	if(div){
		if(div.presv){
			div.presv();
			delete div.presv;
			delete div.prejt;
		}
		hideElement(div);
	}
}
/**
 * Call from html event.
 *
 * @param {Event} evt
 * @return {!Promise<void>}
 */
async function okModal(evt){
	/** @type {string} */
	var typ = "";
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("div", nextElement(getElement("#spanModal")));
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		/** @type {Element} */
		var ele = eles[i];
		if(ele.hasAttribute("type")){
			if(isVisible(ele)){
				typ = ele.getAttribute("type");
				break;
			}
		}
	}

	/** @type {boolean} */
	var ret = false;
	switch(typ){
	case "new":
		ret = await newFolder();
		break;
	case "upload":
		/** @type {Array<File>} */
		var files = [];
		/** @type {FileList} */
		var flst = getElement("#upfiles").files;
		for(i=0; i<flst.length; i++){
			files.push(flst[i]);
		}
		flst = getElement("#upfolder").files;
		for(i=0; i<flst.length; i++){
			files.push(flst[i]);
		}
		if(files.length <= 0){
			showError("noFiles");
		}else{
			ret = true;
			upload(files);
		}
		break;
	case "selfldr":
		/** @type {Element} */
		var div = getElement("#divModal");
		/** @type {Element} */
		var ul = getHeaderUl(div);
		/** @type {Element} */
		var li = previousElement(ul, "li", true);
		/** @type {string} */
		var pntid = li.getAttribute("uid") ;
		if(pntid != g_paths[g_paths.length - 1]._id){
			hideModal(evt);
			/** @type {string} */
			var uid = div.getAttribute("uid");
			await moveToFolder(pntid, uid);
		}
		break;
	}
	if(ret){
		hideModal(evt);
	}
}
/**
 * @param {string|Element} div
 * @return {Element} ul
 */
function getHeaderUl(div){
	return getElement(".zb-main-header", div).children[0];
}
/**
 * @param {string|Element} div
 * @return {Element} ul
 */
function getListUl(div){
	return getElement("zb-main-list", div, "ul.class");
}
/**
 * Get the span of name.
 *
 * @param {Element} itm li
 * @return {Element} span
 */
function getNameSpan(itm){
	return getElement("fnm", itm, "span.name");
}

/**
 * @param {string} fnm
 * @return {string}
 */
function encryptFname(fnm){
	if(g_conf[g_rootidx]["encfname"]){
		return zbEncryptString(fnm, g_keycfg);
	}else{
		return fnm;
	}
}
/**
 * @param {string} fnm
 * @return {string}
 */
function decryptFname(fnm){
	if(g_conf[g_rootidx]["encfname"]){
		try{
			return zbDecryptString(fnm, g_keycfg);
		}catch(ex){
			console.error(ex);
		}
	}
	return fnm;
}
/**
 * Event called from html
 */
async function onbody(){
	g_storage = new ZbLocalStorage();
	await g_storage.initIdxDb().catch(function(a_err){
		showError("IndexedDB is not supported in your browser settings.");
	});
	await loadSettings();
}
/**
 * A function.
 * @return {!Promise<void>}
 */
async function checkRootFolder(){
	/** @type {Array<Element>} */
	var uls = [getHeaderUl("#divMain"), getElement("ul", "#divHistory")];
	uls.forEach(function(a_ul){
		/** @type {number} */
		var a_i = 0;
		/** @type {Array<Element>} */
		var a_eles = getElementsByAttribute("li", a_ul);
		for(a_i = 0; a_i < a_eles.length; a_i++){
			if(!a_eles[a_i].classList.contains("template")){
				a_eles[a_i].remove();
			}
		}
	});
	showMenuHistory(false);

	hideSetPwd();
	showElement(".zb-nav-tools");
	showElement("#divMain");

	/** @type {DriveInfo|undefined} */
	var a_dat = await g_drive.getDrive({}).catch(function(a_err){
		showError(a_err);
	});
	if(!a_dat){
		return;
	}
	/** @type {Element} */
	var a_ele = getElement("#spanQuota");
	a_ele.setAttribute("total", a_dat._total);
	a_ele.setAttribute("trash", a_dat._trash);
	addQuotaUsed(a_dat._used);

	/** @type {string} */
	var fldr = /** @type {string} */(g_conf[g_rootidx]["root"]);
	// Get root folder.
	/** @type {Array<DriveItem>|undefined} */
	var a_arr = await g_drive.searchItems({
		_fname: fldr,
	}).catch(function(a_err){
		showError(JSON.stringify(a_err));
	});
	if(a_arr && a_arr.length > 0){
		g_paths = new Array();
		g_paths.push(a_arr[0]);
		await registerServiceWorker();
		await listFolder();
		await loadRecent();
		return;
	}
	// Create root folder
	/** @type {DriveItem|undefined} */
	var b_dat = await g_drive.newFolder({
		_folder: fldr,
	}).catch(function(b_err){
		showError(JSON.stringify(b_err));
	});
	if(b_dat){
		g_paths = new Array();
		g_paths.push(b_dat);
		await registerServiceWorker();
		await listFolder();
	};
}
/**
 * @param {string|number} sz
 * @param {boolean=} trashFlg
 */
function addQuotaUsed(sz, trashFlg){
	/** @type {Element} */
	var ele = getElement("#spanQuota");
	if(typeof sz == "string"){
		sz = parseInt(sz, 10);
	}
	/** @type {number} */
	var total = getIntAttr(ele, "total");
	/** @type {number} */
	var trash = getIntAttr(ele, "trash");
	/** @type {number} */
	var used = 0;
	if(ele.hasAttribute("used")){
		used = getIntAttr(ele, "used");
	}
	if(trashFlg){
		used -= sz;
		ele.setAttribute("used", used);
		if(total > 0){
			trash += sz;
			ele.setAttribute("trash", trash);
			return;
		}
	}else{
		used += sz;
		ele.setAttribute("used", used);
	}
	if(total > 0){
		/** @type {number} */
		var free = total - used - trash;
		ele.innerText = window["msgs"]["quotaInfo"].replace("{0}", getSizeDisp(free));
	}else{
		ele.innerText = window["msgs"]["quotaInfoU"].replace("{0}", getSizeDisp(used));
	}
}
/**
 * @param {boolean} showFl
 */
function showMenuHistory(showFl){
	/** @type {Element} */
	var nav = getElement("nav");
	/** @type {function(string, string)} */
	var _showMenuHistory = function(a_divcls, a_mnutag){
		/** @type {Element} */
		var a_nt = getElement(a_divcls, nav, "div.class");
		/** @type {Element} */
		var a_mnu = getElement("menuHistory", a_nt, a_mnutag.concat(".iid"));
		/** @type {Element} */
		var a_li = findParent("li", a_mnu);
		if(showFl){
			showElement(a_li);
		}else{
			hideElement(a_li);
		}
	};
	_showMenuHistory("zb-nav-tools", "span");
	_showMenuHistory("zb-nav-menu", "label");
}
/**
 * @return {!Promise<void>}
 */
async function loadRecent(){
	g_recents = g_storage.getRecent();
	if(!g_recents){
		return;
	}
	/** @type {Element} */
	var ul = getElement("ul", "#divHistory");
	/** @type {number} */
	var a_idx = 0;
	while(a_idx < g_recents.length){
		/** @type {PlayedInfo} */
		var a_rct = g_recents[a_idx];
		// /* Get recent item. */
		/** @type {DriveItem|undefined} */
		var b_dat = await g_drive.getItem({
			/** @type {string} */
			_uid: a_rct._fid,
		}).catch(function(b_err){
		});
		if(b_dat){
			if(b_dat._parentId){
				a_rct._folder = b_dat._parentId;
			}
			setRecent(a_idx, decryptFname(b_dat._name), ul);
		};
		a_idx++;
	}
	if(g_recents.length > 0){
		showMenuHistory(true);
	}
}
/**
 * @param {number} idx
 * @param {string} nm
 * @param {Element=} ul
 */
function setRecent(idx, nm, ul){
	if(!ul){
		ul = getElement("ul", "#divHistory");
	}

	/** @type {PlayedInfo} */
	var pif = g_recents[idx];
	/** @type {Element} */
	var spnm = null;
	/** @type {Element} */
	var l = getElement(pif._folder, ul, "li.parentId");
	if(l == null){
		l = getElement("template", ul, "li.class").cloneNode(true);
		l.classList.remove("template");

		/** @type {Array<Element>} */
		var eles = getElementsByAttribute("span", l);
		/** @type {number} */
		var i = 0;
		for(i=0; i<eles.length; i++){
			/** @type {Element} */
			var sp = eles[i];
			switch(sp.getAttribute("name")){
			case "delete":
				sp.addEventListener("click", clickDeleteRecent);
				break;
			case "file":
				sp.addEventListener("click", clickRecent);
				spnm = sp;
				break;
			case "next":
				sp.addEventListener("click", clickRecentNext);
				break;
			}
		}
		l.setAttribute("parentId", pif._folder);
		ul.appendChild(l);

	}else{
		spnm = getElement("file", l, "span.name");
	}

	spnm.innerText = nm;
	if(pif._time){
		spnm.innerText = spnm.innerText.concat(" [").concat(getTimeDisp(Math.floor(pif._time))).concat("]");
	}
}
/**
 * @param {boolean=} reload
 * @param {boolean=} onlyfolder
 * @param {DriveItem=} fld
 * @return {!Promise<Array<DriveItem>>}
 */
async function listFolder(reload, onlyfolder, fld){
	/** @type {number} */
	var idx = 0;
	if(!fld){
		if(g_paths.length <= 0){
			return null;
		}
		idx = g_paths.length - 1;
		fld = g_paths[idx];
	}
	/** @type {string} */
	var divid = "#divMain";
	if(onlyfolder){
		divid = "#divModal";
	}

	/** @type {number} */
	var i = 0;
	/** @type {Element} */
	var div = getElement(divid);
	/** @type {Element} */
	var ulPath = getHeaderUl(div);
	/** @type {Element} */
	var ulList = getListUl(div);

	showInfo("loading");

	/** @type {Array<Element>} */
	var eles = getListItems(ulList);
	for(i=0; i<eles.length; i++){
		ulList.removeChild(eles[i]);
	}

	/** @type {Element} */
	var oldlnk = previousElement(ulPath, undefined, true);
	if(oldlnk && oldlnk.classList.contains("template")){
		oldlnk = null;
	}

	if(reload){
		if(oldlnk){
			oldlnk.classList.remove("normal");
		}
	}else{
		if(oldlnk){
			if(idx == 0 && !onlyfolder){
				// while(oldlnk){
					// if(oldlnk.classList.contains("template")){
						// break;
					// }else{
						// ulPath.removeChild(oldlnk);
						// oldlnk = previousElement(ulPath, undefined, true);
					// }
				// }
			}else{
				oldlnk.classList.add("normal");
			}
		}
		addPath(ulPath, fld, idx);
	}

	/** @type {Array<DriveItem>|undefined} */
	var a_arr = await g_drive.searchItems({
		_parentid: fld._id,
	}).catch(function(a_err){
		showError(a_err);
	});
	if(a_arr){
		/**
		 * Sort by name
		 *
		 * @type {Array<DriveItem>}
		 */
		var a_sort = new Array();
		/**
		 * Folder Count
		 *
		 * @type {number}
		 */
		var a_fdcnt = 0;
		a_arr.forEach(/** function(DriveItem) */function(b_ele){
			/** @type {number} */
			var b_i = 0;
			/** @type {number} */
			var b_j = a_sort.length;
			b_ele._name = decryptFname(b_ele._name);
			b_ele._sname = zbCharUtil.kiyoneStr(b_ele._name);
			if(isFolder(b_ele)){
				b_j = a_fdcnt++;
			}else{
				b_i = a_fdcnt;
			}
			while(b_i<b_j){
				if(b_ele._sname < a_sort[b_i]._sname){
					break;
				}else if(b_ele._sname == a_sort[b_i]._sname && b_ele._name < a_sort[b_i]._name){
					break;
				}else{
					b_i++;
				}
			}
			if(b_i < a_sort.length){
				a_sort.splice(b_i, 0, b_ele);
			}else{
				a_sort.push(b_ele);
			}
		});
		/* Create List */
		a_sort.forEach(/** function(DriveItem, number) */function(b_ele, b_idx){
			if(!onlyfolder || isFolder(b_ele)){
				addItem(ulList, b_ele);
			}
		});
		if(!onlyfolder){
			/** @type {Element} */
			var a_chk = getElement("#chkAll");
			/** @type {Element} */
			var a_li = findParent("li", a_chk);
			getElement("checkbox", a_li, "input.type").checked = false;
			hideElement(getElement("chkbox", a_li, "span.name"));
			if(a_arr.length > 0){
				showElement(a_chk);
			}else{
				hideElement(a_chk);
			}
		}
		hideMessage();
		return a_sort;
	}else{
		return null;
	}
}
/**
 * @param {Element} ul
 * @param {DriveItem} fld
 * @param {number} idx
 * @param {boolean=} norm
 */
function addPath(ul, fld, idx, norm){
	/** @type {Element} */
	var l = getElement("template", ul, "li.class").cloneNode(true);
	/** @type {Element} */
	var sp = getElement("span", l);
	sp.innerText = fld._name;
	l.setAttribute("name", "folder");
	l.setAttribute("uid", fld._id);
	l.setAttribute("idx", idx);
	l.addEventListener("click", clickPath);
	l.classList.remove("template");
	if(norm){
		l.classList.add("normal");
	}
	showElement(l);
	ul.appendChild(l);
}
/**
 * @param {string} sid id of svg
 * @param {string=} fl The color of style fill.
 * @return {Element} the svg element
 */
function createSvg(sid, fl){
	/** @type {Element} */
	var b_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	/** @type {Element} */
	var b_use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	if(fl){
		b_svg.style.fill = fl;
	}
	b_use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#".concat(sid));
	b_svg.appendChild(b_use);
	return b_svg;
}
/**
 * @param {Element} ul
 * @param {DriveItem} itm
 */
function addItem(ul, itm){
	/** @type {string} */
	var fnm = itm._name;
	/** @type {string} */
	var sz = "";
	/** @type {string} */
	var tms = "";
	/** @type {Element} */
	var l = getElement("template", ul, "li.class").cloneNode(true);
	l.classList.remove("template");
	l.setAttribute("uid", itm._id);
	l.setAttribute("utype", /** @type {string} */(itm._type));

	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("span", l);
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		/** @type {Element} */
		var sp = eles[i];
		switch(sp.getAttribute("name")){
		case "fnm":
			sp.innerText = fnm;
			sp.addEventListener("click", /** @type {function(Event)} */(clickItem));
			break;
		case "icon":
			if(isFolder(itm)){
				setSvgImage(sp, "folder", "#FFD679");
			}else{
				/** @type {string} */
				var sfx = getSfx(fnm);
				if(g_imagetypes[sfx]){
					setSvgImage(sp, "image", "#E7FFE7"); // green
				}else if(g_videotypes[sfx]){
					setSvgImage(sp, "video", "#FFE7F3"); // pink
				}else if(g_audiotypes[sfx]){
					setSvgImage(sp, "audio", "#DBFBFD"); // blue
				}else{
					setSvgImage(sp, "file", "#FFFFB0"); // yellow
				}
			}
			sp.addEventListener("click", clickIcon);
			break;
		case "chkbox":
			sp.addEventListener("click", clickIcon);
			hideElement(sp);
			break;
		case "edit":
			sp.addEventListener("click", showDropdown);
			break;
		case "size":
			if(!sz){
				sz = getSizeDisp(/** @type {number} */(itm._size));
			}
			sp.innerText = sz;
			break;
		case "tms":
			if(!tms){
				tms = getTimestampDisp(/** @type {string} */(itm._lastModifiedDateTime));
			}
			sp.innerText = tms;
			break;
		}
	}

	showElement(l);
	ul.appendChild(l);
}
/**
 * @param {Element} l li
 * @param {number=} chkd 1 means set to true, -1 means set to false
 */
function switchChecked(l, chkd){
	/** @type {Element} */
	var chk = getElement("checkbox", l, "input.type");
	if(chkd == 1){
		chk.checked = true;
	}else if(chkd == -1){
		chk.checked = false;
	}else{
		chk.checked = !chk.checked;
		if(chk.checked){
			chkd = 1;
		}else{
			chkd = -1;
		}
	}
	if(chkd > 0){
		showElement(getElement("chkbox", l, "span.name"));
	}else{
		hideElement(getElement("chkbox", l, "span.name"));
	}	
}
/**
 * @param {Event} evt
 */
function clickIcon(evt){
	switchChecked(findParent("li"));
}
/**
 * Event called from html
 * @param {string|Event} uidevt Event or uid
 * @param {number=} direction
 * @param {boolean=} noLoop
 * @return {!Promise<void>}
 *
 * direction: 1 previous, 2 next, self if omitted.
 */
async function clickItem(uidevt, direction, noLoop){
	/** @type {Element} */
	var itm = null;
	/** @type {string} */
	var uid = "";
	/** @type {boolean} */
	var onlyfolder = false;
	if(typeof uidevt == "string"){
		uid = uidevt;
	}else{
		itm = findParent("li");
		uid = itm.getAttribute("uid");
		onlyfolder = (findParent("div", itm).getAttribute("type") == "selfldr");
	}
	if(direction || !itm){
		itm = getMenuTarget(uid, direction, noLoop);
		uid = itm.getAttribute("uid");
	}

	/** @type {DriveItem} */
	var drvitm = {
		_id: uid,
		_name: getNameSpan(itm).innerText,
		_type: itm.getAttribute("utype"),
	};
	if(isFolder(itm)){
		if(onlyfolder){
			await listFolder(false, true, drvitm);
		}else{
			g_paths.push(drvitm);
			await listFolder();
		}
	}else{
		viewFile(drvitm._id, drvitm._name);
	}

}
/**
 * Event called from html
 * @param {Event} evt
 * @return {!Promise<void>}
 */
async function clickPath(evt){
	/** @type {Element} */
	var itm = findParent("li");
	/** @type {Element} */
	var ul = findParent("ul", itm);
	/** @type {boolean} */
	var onlyfolder = (findParent("div", ul).getAttribute("type") == "selfldr");

	/** @type {number} */
	var cnt = 0;
	/** @type {Element} */
	var next = nextElement(itm);
	while(next){
		if(next.tagName == itm.tagName){
			cnt++;
		}
		next = nextElement(next);
	}
	if(cnt > 0){
		/** @type {number} */
		var i = 0;
		for(i=0; i<cnt; i++){
			ul.removeChild(ul.lastElementChild);
		}
	}

	if(onlyfolder){
		await listFolder(true, true, {
			_name: getElement("span", itm).innerText,
			_id : itm.getAttribute("uid"),
		});
	}else{
		cnt = getIntAttr(itm, "idx");
		if(cnt < g_paths.length - 1){
			g_paths.splice(cnt + 1);
		}
		await listFolder(true);
	}
}
/**
 * @param {Element|DriveItem|string} f
 * @return {boolean}
 */
function isFolder(f){
	/** @type {string} */
	var typ = "";
	if(f instanceof HTMLElement){
		typ = f.getAttribute("utype");
	}else if(typeof f == "string"){
		typ = f;
	}else{
		typ = /** @type {string} */(f._type);
	}
	return (typ == "1");
}
/**
 * Event called from html
 */
function selectAll(){
	/** @type {Element} */
	var l = findParent("li");
	/** @type {Element} */
	var chk = getElement("checkbox", l, "input.type");
	switchChecked(l);
	/** @type {number} */
	var chkd = -1;
	if(chk.checked){
		chkd = 1;
	}
	
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("li", findParent("ul", l));
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		if(!(eles[i].classList.contains("header") || eles[i].classList.contains("template"))){
			switchChecked(eles[i], chkd);
		}
	}
}
/**
 * Event called from html
 * @param {Event} evt
 */
function showDropdown(evt){
	/** @type {Element} */
	var btn = findParent("span");
	/** @type {DOMRect} */
	var rect = btn.getBoundingClientRect();
	/** @type {Element} */
	var li = findParent("li", btn);
	/** @type {Element} */
	var menu = getElement("#ulIteMenu");
	/** @type {number} */
	var mwid = 0;
	if(menu.hasAttribute("ofwid")){
		mwid = parseInt(menu.getAttribute("ofwid"), 10);
	}else{
		//showElement(menu);
		//To fix the problem of some browser can't show menu properly.
		// Such as Kiwi Browser for Android.
		menu.style.display = "block";
		mwid = menu.offsetWidth;
		menu.setAttribute("ofwid", mwid);
	}
	if(rect.right + mwid > document.body.offsetWidth){
		menu.style.left = (rect.left - mwid) + "px";
	}else{
		menu.style.left = rect.right + "px";
	}
	menu.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) + rect.top) + "px";
	menu.setAttribute("uid", li.getAttribute("uid"));
	menu.setAttribute("utype", li.getAttribute("utype"));
	/** @type {MenuType} */
	evt.buttonKey = MenuType.ITEM;
}
/**
 * @param {string} uid
 * @param {number=} direction
 * @param {boolean=} noLoop
 * @return {Element}
 *
 * direction: 1 previous, 2 next, self if omitted.
 */
function getMenuTarget(uid, direction, noLoop){
	if(!uid){
		return null;
	}
	/** @type {Element} */
	var ul = getListUl("#divMain");
	/** @type {Array<Element>} */
	var eles = getListItems(ul);
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		if(eles[i].getAttribute("uid") == uid){
			break;
		}
	}
	if(i >= eles.length){
		/* Not Found */
		return null;
	}
	switch(direction){
	case 1:
		// Skip folder
		while(i >= 0){
			i--;
			if(i < 0){
				if(noLoop){
					return null;
				}else{
					noLoop = true; // To prevent infinite loop.
					i = eles.length - 1;
				}
			}
			if(!isFolder(eles[i])){
				break;
			}
		}
		break;
	case 2:
		// Skip folder
		while(i < eles.length){
			i++;
			if(i >= eles.length){
				if(noLoop){
					return null;
				}else{
					noLoop = true; // To prevent infinite loop.
					i = 0;
				}
			}
			if(!isFolder(eles[i])){
				break;
			}
		}
		break;
	}
	return eles[i];
}
/**
 * Event called from html
 *
 * @param {Event} evt
 * @return {!Promise<void>}
 */
async function clickIteMenu(evt){
	/** @type {Element} */
	var li = findParent("li");
	/** @type {Element} */
	var ul = findParent("ul", li);
	/** @type {string} */
	var uid = ul.getAttribute("uid");
	if(!uid){
		return;
	}

	/** @type {string} */
	var act = getElement("label", li).getAttribute("iid");
	switch(act){
	case "menuDownload":
		if(isFolder(ul)){
			showError("noDownFolder");
		}else{
			downloadById(uid);
		}
		break;
	case "menuRename":
		/** @type {Element} */
		var div = getElement("#divInpName");
		/** @type {Element} */
		var txt = getElement("input", div);
		/** @type {Element} */
		var itm = getMenuTarget(uid);
		/** @type {Element} */
		var sp = getNameSpan(itm);
		/** @type {DOMRect} */
		var rect = sp.getBoundingClientRect();
		/** @type {DOMRect} */
		var rect2 = getElement("edit", itm, "span.name").getBoundingClientRect();
		txt.value = sp.innerText;
		div.style.left = rect.left + "px";
		div.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) + rect.top - 2) + "px";
		txt.style.width = (rect2.left - rect.left) + "px";
		txt.style.height = (rect.height + 2) + "px";
		showElement(div);
		txt.focus();
		/** @type {MenuType} */
		evt.buttonKey = MenuType.TEXT;
		break;
	case "menuMove":
		await showMove(uid);
		break;
	case "menuDelete":
		await deleteItems(uid);
		break;
	}
}
/**
 * @param {string} uid 
 */
function downloadById(uid){
	/** @type {Element} */
	var itm = getMenuTarget(uid);
	/** @type {Element} */
	var sp = getNameSpan(itm);
	/** @type {DriveItem} */
	var drvitm = {
		_name: sp.innerText,
		_id: uid,
	};
	download([drvitm]);
}
/**
 * @param {string=} uid
 * @return {!Promise<void>}
 */
async function showMove(uid){
	/** @type {Element} */
	var div = getElement("#divModal");
	if(uid){
		div.setAttribute("uid", uid);
	}else if(getMultiChecked()){
		div.removeAttribute("uid");
	}else{
		return;
	}
	/** @type {Element} */
	var ul = getHeaderUl(div);
	/** @type {Array<Element>} */
	var eles = getListItems(ul);
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		ul.removeChild(eles[i]);
	}
	await listFolder(false, true, g_paths[0]);
	await showModal("selfldr");
}
/**
 * Event called from html
 *
 * @param {Event} evt
 * @return {boolean}
 */
function keyupNewname(evt){
	if(evt.keyCode === 13){ // Enter Key
		if(evt.shiftKey || evt.ctrlKey || evt.altKey){
			return true;
		}
	}else if(evt.keyCode === 27){ // Esc Key
		hideElement(findParent("div"));
		return false;
	}else{
		return true;
	}
	admitRename();
	return false;
}
/**
 * Event called from html
 * @return {!Promise<void>}
 */
async function admitRename(){
	/** @type {Element} */
	var div = findParent("div");
	/** @type {Element} */
	var txt = getElement("input", div);
	if(!txt.value){
		showError("noNewName");
		return;
	}
	/** @type {Element} */
	var menu = getElement("#ulIteMenu");
	/** @type {string} */
	var uid = menu.getAttribute("uid");
	/** @type {Element} */
	var itm = getMenuTarget(uid);
	if(itm){
		/** @type {Element} */
		var sp = getNameSpan(itm);
		if(txt.value != sp.innerText){
			/** @type {string} */
			var fnm = encryptFname(txt.value);
			/** @type {DriveUpdateOption} */
			var opt = {
				/** @type {string} */
				_fid: uid,
				/** @type {string} */
				_newname: fnm,
			}
			try{
				await g_drive.rename(opt);
				sp.innerText = txt.value;
				showNotify("renDone");
			}catch(a_err){
				showError(a_err);
			}
		}
	}
	hideElement(div);
}
/**
 * @param {string} pntid
 * @param {string} uid
 * @return {!Promise<void>}
 */
async function moveToFolder(pntid, uid){
	/** @type {Array<DriveItem>} */
	var arr = [];
	if(uid){
		arr.push({
			_id: uid,
			_name: "",
		});
	}else{
		arr = getMultiChecked();
	}
	if(arr.length == 0){
		return;
	}

	showInfo("moving");
	/** @type {boolean} */
	var noerr = true;
	/** @type {number} */
	var idx = 0;
	while(noerr && idx < arr.length){
		await g_drive.move({
			_fid: arr[idx]._id,
			_parentid: pntid,
			_oldparentid: g_paths[g_paths.length - 1]._id,
		}).catch(function(err){
			showError(err);
			noerr = false;
		});
		idx++;
	}
	if(noerr){
		await listFolder(true, false);
		showNotify("moveDone");
	}
}
/**
 * @param {string=} uid
 * @return {!Promise<void>}
 */
async function deleteItems(uid){
	/** @type {Array<DriveItem>} */
	var arr = null;
	if(uid){
		arr = [/** @type {DriveItem} */({
			_id: uid,
			_name: "",
		})];
	}else{
		arr = getMultiChecked();
	}
	if(!arr){
		return;
	}
	if(!confirm(window["msgs"]["delConfirm"])){
		return;
	}

	showInfo("deleting");
	/** @type {boolean} */
	var noerr = true;
	/** @type {number} */
	var idx = 0;
	while(noerr && idx < arr.length){
		/** @type {number|undefined} */
		var sz = await g_drive.delete({
			_fid: arr[idx]._id,
		}).catch(function(err){
			showError(err);
			noerr = false;
		});
		if(sz){
			addQuotaUsed(sz, true);
		}
		idx++;
	}

	if(noerr){
		await listFolder(true, false);
		showNotify("delDone");
	}
}
/**
 * @return {!Promise<boolean>}
 */
async function newFolder(){
	/** @type {string} */
	var fldnm = getElement("#fldnm").value;
	if(!fldnm){
		showError("noFldName");
		return false;
	}
	/** @type {boolean} */
	var finto = getElement("#chkFInto").checked;
	/** @type {DriveNewFolderOption} */
	var opt = {
		/** @type {string} */
		_folder: encryptFname(fldnm),
	}
	if(g_paths.length > 0){
		opt._parentid = g_paths[g_paths.length - 1]._id;
	}
	/** @type {DriveItem|undefined} */
	var a_dat = await g_drive.newFolder(opt).catch(function(a_err){
		showError(a_err._restext);
	});
	if(a_dat){
		a_dat._name = fldnm;
		if(finto){
			g_paths.push(a_dat);
			await listFolder(false, false);
		}else{
			addItem(getListUl("#divMain"), a_dat);
			showNotify("flDone");
		}
		return true;
	}else{
		return false;
	}
}
/**
 * @param {boolean=} noFolder
 * @return {?Array<DriveItem>}
 */
function getMultiChecked(noFolder){
	/** @type {Array<DriveItem>} */
	var files = new Array();
	/** @type {Array<Element>} */
	var eles = getListItems(getListUl("#divMain"));
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		if(getElement("checkbox", eles[i], "input.type").checked){
			if(noFolder && isFolder(eles[i])){
				showError("noDownFolder");
				return null;
			}else{
				files.push({
					_name: getNameSpan(eles[i]).innerText,
					_id: eles[i].getAttribute("uid"),
				});
			}
		}
	}
	if(files.length <= 0){
		showError("noChecks");
		return null;
	}else{
		return files;
	}
}
/**
 * @param {string} fid
 * @param {string} fnm
 * @return {!Promise<void>}
 */
async function viewFile(fid, fnm){
	/** @type {Element} */
	var div = getElement("#diViewer");
	/** @type {Element} */
	var div2 = findParent("zb-viewer", div, "div.class");
	/** @type {Element} */
	var sptl = getElement("title", div2, "span.name");
	/** @type {Element} */
	var span = getElement("span", div);
	/** @type {Element} */
	var img = getElement("img", div);
	/** @type {Element} */
	var vdo = await endMediaStream("video", div);
	/** @type {Element} */
	var ado = await endMediaStream("audio", div);

	span.innerText = window["msgs"]["loading"];
	showElement(span);
	hideElement(nextElement(span));
	hideElement(img);
	sptl.innerText = fnm;
	img.src = "";
	div.setAttribute("uid", fid);
	showElement(findParent("zb-modal", div2, "div.class"));

	/** @type {string} */
	var sfx = getSfx(fnm);
	/** @type {string} */
	var imgType = g_imagetypes[sfx];
	/** @type {string} */
	var vdoType = g_videotypes[sfx];
	/** @type {string} */
	var adoType = g_audiotypes[sfx];

	if(isSwReady() && vdoType){
		/** @type {string} */
		vdo.fid = fid;
		/** @type {string} */
		vdo.fnm = fnm;
		vdo.src = g_SWPATH + fid;
		showElement(vdo);
		hideElement(span);
		return;
	}else if(isSwReady() && adoType){
		/** @type {string} */
		ado.fid = fid;
		/** @type {string} */
		ado.fnm = fnm;
		ado.src = g_SWPATH + fid;
		showElement(ado);
		img.src = "img/logo.png";
		showElement(img);
		hideElement(span);
		return;
	}else if(!imgType){
		span.innerText = window["msgs"]["cantView"];
		showElement(nextElement(span));
		return;
	}

	/** @type {ZBReader} */
	var reader = g_drive.createReader({
		_id: fid,
		_bufSize: 160000,
	});
	/** @type {ZBlobWriter} */
	var writer = new ZBlobWriter();
	/** @type {ZbCrypto} */
	var cypt = new ZbCrypto({
		_decrypt: true,
		_keycfg: g_keycfg,
		_reader: reader,
		_writer: writer,
	});
	try{
		/** @type {boolean} */
		var a_done = await cypt.start();
		if(!a_done){
			console.log("Not done!");
			return;
		}
		var a_buf = writer.getBuffer();
		if(!(a_buf instanceof Uint8Array)){
			a_buf = new Uint8Array(a_buf);
		}
		if(imgType){
			var a_blob = new Blob([a_buf], { "type" : imgType });
			img.src = window.URL.createObjectURL(a_blob);
			showElement(img);
			hideElement(span);
		}
	}catch(a_err){
		console.log(a_err);
	}
}
/**
 * Event called from html
 * @param {Event=} evt
 */
function switchShowPrevNext(evt){
	/** @type {Element} */
	var div = getElement(evt ? evt : "#diViewer");
	/** @type {Element} */
	var tgt = nextElement(div, "div");
	/** @type {string} */
	var opa = "";
	if(evt){
		if(tgt.style.opacity){
			/* Do nothing when click the viewer during button is displaying. */
			return;
		}else{
			opa = "1";
		}
	}
	while(tgt){
		tgt.style.opacity = opa;
		tgt = nextElement(tgt, "div");
	}
	if(evt){
		window.setTimeout(switchShowPrevNext, 5000);
	}
}
/**
 * Event called from html
 */
function clickPrevious(){
	/** @type {string} */
	var uid = getElement("#diViewer").getAttribute("uid");
	if(uid){
		clickItem(uid, 1);
	}
}
/**
 * Event called from html
 */
function clickNext(){
	/** @type {string} */
	var uid = getElement("#diViewer").getAttribute("uid");
	if(uid){
		clickItem(uid, 2);
	}
}
/**
 * Call from html event.
 * @param {Event} evt
 * @return {!Promise<void>}
 */
async function exitViewer(evt){
	await endMediaStream("video", getElement("#diViewer"));
	await endMediaStream("audio", getElement("#diViewer"));
	hideModal(evt);
}
/**
 * Event called from html
 */
function imageLoaded(){
	/** @type {EventTarget} */
	var img = getElement();
	if(img && img.src){
		window.URL.revokeObjectURL(img.src);
	}
}
/**
 * @param {string} tag
 * @param {Element} div
 * @return {!Promise<Element>}
 */
async function endMediaStream(tag, div){
	/** @type {Element} */
	var vdo = getElement(tag, div);
	/** @type {string} */
	var ctm = vdo.currentTime;
	if(vdo.src){
		vdo.removeAttribute("src");
		vdo.load();
	}
	if(vdo.fid){
		releaseSwReader(vdo.fid);

		/** @type {string} */
		var parentid = g_paths[g_paths.length - 1]._id;
		/** @type {string} */
		var fnm = vdo.fnm;
		/** @type {number} */
		var i = 0;
		if(!g_recents){
			g_recents = new Array();
		}
		for(i=0; i<g_recents.length; i++){
			if(g_recents[i]._folder == parentid){
				g_recents[i]._fid = vdo.fid;
				g_recents[i]._time = ctm;
				break;
			}
		}
		if(i == g_recents.length){
			g_recents.push({
				_fid: vdo.fid,
				_folder: parentid,
				_time: ctm,
			});
		}
		delete vdo.fid;
		delete vdo.fnm;
		await g_storage.saveRecent(g_recents[i], i);
		setRecent(i, fnm);
		showMenuHistory(true);
	}
	hideElement(vdo);
	return vdo;
}
/**
 * @param {Element} li
 * @return {number}
 */
function findRecentIndex(li){
	/** @type {string|undefined} */
	var pnt = li.getAttribute("parentId");
	if(pnt && g_recents){
		/** @type {number} */
		var i = 0;
		for(i=0; i<g_recents.length; i++){
			if(g_recents[i]._folder == pnt){
				return i;
			}
		}
	}
	return -1;
}
/**
 * @param {Event} evt
 * @param {boolean=} next
 * @return {!Promise<void>}
 */
async function clickRecent(evt, next){
	getElement("close", "#divHistory", "span.name").click();
	/** @type {Element} */
	var ele = getElement(evt);
	/** @type {Element} */
	var li = findParent("li", ele);

	/** @type {number} */
	var idx = findRecentIndex(li);
	if(idx < 0){
		return;
	}
	/** @type {PlayedInfo} */
	var pif = g_recents[idx];
	/** @type {string} */
	var fid = pif._fid;
	/** @type {string|undefined} */
	var pnt = pif._folder;
	/** @type {string} */
	var ctime = pif._time;

	// locate folder
	showInfo("loading");
	/** @type {Array<DriveItem>} */
	var paths = new Array();

	while(pnt && pnt != g_paths[0]._id){
		/** @type {DriveItem|undefined} */
		var a_dat = await g_drive.getItem({
			/** @type {string} */
			_uid: pnt,
		}).catch(function(a_err){
		});
		if(a_dat){
			a_dat._name = decryptFname(a_dat._name);
			paths.unshift(a_dat);
			if(a_dat._parentId == g_paths[0]._parentId){
				// The recent file is not in this root folder.
				pnt = undefined;
			}else{
				pnt = a_dat._parentId;
			}
		}else{
			pnt = undefined;
		}
	}
	if(pnt == g_paths[0]._id){
		paths.unshift(g_paths[0]);
	}else{
		showInfo("cantPlayRecent");
		return;
	}

	/** @type {Element} */
	var a_ulPath = getHeaderUl("#divMain");
	/** @type {number} */
	var a_i = 0;
	/** @type {Array<Element>} */
	var a_eles = getElementsByAttribute("li", a_ulPath);
	for(a_i = 0; a_i < a_eles.length; a_i++){
		if(!a_eles[a_i].classList.contains("template")){
			a_eles[a_i].remove();
		}
	}
	for(a_i = 0; a_i < paths.length; a_i++){
		addPath(a_ulPath, paths[a_i], a_i, true);
	}
	g_paths = paths;
	/** @type {Array<DriveItem>|undefined} */
	var b_arr = await listFolder(true, false);
	if(b_arr){
		/** @type {number} */
		var b_i = 0;
		for(b_i = 0; b_i < b_arr.length; b_i++){
			if(b_arr[b_i]._id == fid){
				break;
			}
		}
		if(b_i < b_arr.length){
			if(next){
				clickItem(fid, 2);
			}else{
				if(ctime){
					getElement("#diViewer").setAttribute("ctime", ctime);
				}
				clickItem(fid);
			}
		}
	}
}
/**
 * @param {Event} evt
 */
function clickRecentNext(evt){
	clickRecent(evt, true);
}
/**
 * @param {Event} evt
 */
function restoreTime(evt){
	/** @type {Element} */
	var ele = getElement(evt);
	/** @type {Element} */
	var div = findParent("div", ele);
	/** @type {string} */
	var ctime = div.getAttribute("ctime");
	if(ctime){
		div.removeAttribute("ctime");
		ele.currentTime = ctime;
	}
}
/**
 * @param {Event} evt
 * @return {!Promise<void>}
 */
async function clickDeleteRecent(evt){
	/** @type {Element} */
	var ele = getElement(evt);
	/** @type {Element} */
	var li = findParent("li", ele);
	/** @type {number} */
	var idx = findRecentIndex(li);
	if(idx < 0){
		return;
	}
	li.remove();
	g_recents.splice(idx, 1);
	await g_storage.removeRecent(idx);
	if(g_recents.length == 0){
		showMenuHistory(false);
	}
}

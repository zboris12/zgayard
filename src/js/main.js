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
function onbody(){
	g_storage = new ZbLocalStorage();
	g_storage.initIdxDb(function(a_err){
		if(a_err){
			showError("IndexedDB is not supported in your browser settings.");
		}
		loadSettings();
	});
}
function checkRootFolder(){
	hideSetPwd();
	getDriveInfo(function(){
		/** @type {string} */
		var fldr = /** @type {string} */(g_conf[g_rootidx]["root"]);
		// Get root folder.
		g_drive.searchItems({
			_fname: fldr,
			_doneFunc: function(a_err, a_arr){
				if(a_err){
					showError(JSON.stringify(a_err));
					return;
				}
				if(a_arr && a_arr.length > 0){
					g_paths = new Array();
					g_paths.push(a_arr[0]);
					listFolder();
					loadRecent();
					return;
				}
				// Create root folder
				g_drive.newFolder({
					_folder: fldr,
					_doneFunc: function(b_err, b_dat){
						if(b_err){
							showError(JSON.stringify(b_err));
						}else{
							g_paths = new Array();
							g_paths.push(b_dat);
							listFolder();
						}
					},
				});
			},
		});
	});
}
/**
 * @param {string|number} sz
 * @param {boolean=} trashFlg
 */
function addQuotaUsed(sz, trashFlg){
	/** @type {Element} */
	var ele = document.getElementById("spanQuota");
	if(typeof sz == "string"){
		sz = parseInt(sz, 10);
	}
	/** @type {number} */
	var total = parseInt(ele.getAttribute("total"), 10);
	/** @type {number} */
	var trash = parseInt(ele.getAttribute("trash"), 10);
	/** @type {number} */
	var used = 0;
	if(ele.hasAttribute("used")){
		used = parseInt(ele.getAttribute("used"), 10);
	}
	if(trashFlg){
		trash += sz;
		ele.setAttribute("trash", trash);
		used -= sz;
		ele.setAttribute("used", used);
		return;
	}else{
		used += sz;
		ele.setAttribute("used", used);
	}
	/** @type {number} */
	var free = total - used - trash;
	ele.innerText = window["msgs"]["quotaInfo"].replace("{0}", g_DRIVES[g_drive.getId()].getName()).replace("{1}", getSizeDisp(free));
}
/**
 * @param {function()} func
 */
function getDriveInfo(func){
	g_drive.getDrive({
		/** @type {function((boolean|DriveJsonRet), DriveInfo=)} */
		_doneFunc: function(a_err, a_dat){
			if(a_err){
				showError(a_err);
			}else{
				/** @type {Element} */
				var a_ele = document.getElementById("spanQuota");
				a_ele.setAttribute("total", a_dat._total);
				a_ele.setAttribute("trash", a_dat._trash);
				addQuotaUsed(a_dat._used);
				if(func){
					func();
				}
			}
		},
	});
}
function loadRecent(){
	/** @type {Element} */
	var div = document.getElementById("divHistory");
	div.style.display = "";
	g_recents = g_storage.getRecent();
	if(!g_recents){
		return;
	}
	/** @type {Element} */
	var div2 = div.getElementsByTagName("div")[0];

	/** @type {function(number)} */
	var showRecent = function(a_idx){
		if(a_idx >= g_recents.length){
			if(g_recents.length > 0){
				div.style.display = "block";
			}
			return;
		}
		/** @type {PlayedInfo} */
		var a_rct = g_recents[a_idx];
		// Get recent item.
		g_drive.getItem({
			/** @type {string} */
			_uid: a_rct._fid,
			/** @type {function((boolean|DriveJsonRet), DriveItem=)} */
			_doneFunc: function(b_err, b_dat){
				if(b_err){
					return;
				}
				if(b_dat._parentId){
					a_rct._folder = b_dat._parentId;
				}
				setRecent(a_idx, decryptFname(b_dat._name), div2);
				showRecent(a_idx+1);
			},
		});
	};

	showRecent(0);
}
/**
 * @param {number} idx
 * @param {string} nm
 * @param {Element=} div
 */
function setRecent(idx, nm, div){
	/** @type {function((number|string)):string} */
	var formaTime = function(a_seconds){
		/** @type {number} */
		var a_s = Math.floor(a_seconds);
		/** @type {number} */
		var a_h = Math.floor(a_s / 3600);
		a_s -= a_h * 3600;
		/** @type {number} */
		var a_m = Math.floor(a_s / 60);
		a_s -= a_m * 60;
		/** @type {Array<string>} */
		var a_arr = new Array();
		if(a_h > 0){
			a_arr.push(a_h.toString());
			a_arr.push("0".concat(a_m).slice(-2));
		}else{
			a_arr.push(a_m.toString());
		}
		a_arr.push("0".concat(a_s).slice(-2));
		return a_arr.join(":");
	};

	if(!div){
		div = document.getElementById("divHistory").getElementsByTagName("div")[0];
	}

	/** @type {Element} */
	var lnk = null;
	/** @type {PlayedInfo} */
	var pif = g_recents[idx];
	/** @type {!NodeList<!Element>} */
	var eles = div.getElementsByTagName("p");
	if(idx < eles.length){
		lnk = eles[idx].getElementsByTagName("a")[0];

	}else{
		/** @type {Element} */
		var p = document.createElement("p");
		/** @type {Element} */
		var span = document.createElement("span");
		span.title = window["msgs"]["spanDelHistory"];
		span.appendChild(createSvg("cmulti", "red"));
		span.addEventListener("click", clickDeleteRecent);
		p.appendChild(span);
		lnk = document.createElement("a");
		lnk.href = "#";
		lnk.addEventListener("click", clickRecent);
		p.appendChild(lnk);
		span = document.createElement("span");
		span.title = window["msgs"]["spanPlayNext"];
		span.appendChild(createSvg("next", "fblue"));
		span.addEventListener("click", clickRecentNext);
		p.appendChild(span);
		div.appendChild(p);
	}

	lnk.innerText = nm;
	lnk.setAttribute("fid", pif._fid);
	if(pif._folder){
		lnk.setAttribute("parentId", pif._folder);
	}
	if(pif._time){
		lnk.setAttribute("time", pif._time);
		lnk.innerText = lnk.innerText.concat(" [").concat(formaTime(pif._time)).concat("]");
	}
}
/**
 * @param {boolean=} reload
 * @param {boolean=} onlyfolder
 * @param {DriveItem=} fld
 * @param {function(Array<DriveItem>)=} func
 */
function listFolder(reload, onlyfolder, fld, func){
	/** @type {number} */
	var idx = 0;
	if(!fld){
		if(g_paths.length <= 0){
			return;
		}
		idx = g_paths.length - 1;
		fld = g_paths[idx];
	}
	/** @type {string} */
	var tblid = "#tblst";
	if(onlyfolder){
		tblid = "#tblFolder";
	}

	/** @type {?TableBody} */
	var t = getTableBody(tblid);
	/** @type {Element} */
	var tbl = t._table;
	/** @type {Element} */
	var tbdy = t._tbody;
	tbdy.innerHTML = "";
	showInfo("loading");

	/** @type {Element} */
	var th = tbl.getElementsByTagName("th")[0];
	/** @type {Element} */
	var oldlnk = previousElement(th, "a", true);
	if(reload){
		if(oldlnk){
			oldlnk.classList.remove("fnormal");
		}
	}else{
		if(oldlnk){
			if(idx == 0 && !onlyfolder){
				th.innerHTML = "";
			}else{
				oldlnk.classList.add("fnormal");
			}
		}
		addPath(th, fld, idx);
	}

	g_drive.searchItems({
		/** @type {function((boolean|DriveJsonRet), Array<DriveItem>=)} */
		_doneFunc: function(a_err, a_arr){
			if(a_err){
				showError(a_err);
				return;
			}
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
				if(isFolder(b_ele)){
					b_j = a_fdcnt++;
				}else{
					b_i = a_fdcnt;
				}
				while(b_i<b_j){
					if(b_ele._name < a_sort[b_i]._name){
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
			// Create List
			a_sort.forEach(/** function(DriveItem, number) */function(b_ele, b_idx){
				if(!onlyfolder || isFolder(b_ele)){
					addItem(tbdy, b_ele, onlyfolder);
				}
			});
			if(!onlyfolder){
				document.getElementById("divHeader").style.display = "block";
				tbl.style.display = "block";
				document.getElementById("divAction").style.display = "block";
				/** @type {Element} */
				var a_chk = document.getElementById("chkAll");
				a_chk.checked = false;
				if(a_arr.length > 0){
					a_chk.style.display = "";
				}else{
					a_chk.style.display = "none";
				}
			}
			if(func){
				func(a_sort);
			}
			showInfo();
		},
		_parentid: fld._id,
	});
}
/**
 * @param {Element} th
 * @param {DriveItem} fld
 * @param {number} idx
 * @param {boolean=} norm
 */
function addPath(th, fld, idx, norm){
	/** @type {Element} */
	var lnk = document.createElement("a");
	/** @type {Element} */
	var span = document.createElement("span");
	lnk.href = "#";
	lnk.innerText = fld._name;
	lnk.setAttribute("uid", fld._id);
	lnk.setAttribute("idx", idx);
	lnk.addEventListener("click", clickPath);
	if(norm){
		lnk.classList.add("fnormal");
	}
	th.appendChild(lnk);
	span.innerText = ">";
	th.appendChild(span);
}
/**
 * @param {string} sid id of svg
 * @param {string=} cls Class
 * @return {Element} the svg element
 */
function createSvg(sid, cls){
	/** @type {Element} */
	var b_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	/** @type {Element} */
	var b_use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	if(cls){
		b_svg.classList.add(cls);
	}
	b_use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#".concat(sid));
	b_svg.appendChild(b_use);
	return b_svg;
}
/**
 * @param {Element} tby
 * @param {DriveItem} itm
 * @param {boolean=} fonly
 */
function addItem(tby, itm, fonly){
	/** @type {Element} */
	var b_tr = document.createElement("tr");
	/** @type {Element} */
	var b_td = document.createElement("td");
	/** @type {Element} */
	var b_link = document.createElement("a");
	var b_fnm = itm._name;
	if(!fonly){
		/** @type {Element} */
		var b_chk = document.createElement("input");
		/** @type {Element} */
		var b_span = document.createElement("span");
		/** @type {Element} */
		var b_btn = document.createElement("span");
		b_chk.type = "checkbox";
		b_td.appendChild(b_chk);
		if(isFolder(itm)){
			b_span.appendChild(createSvg("folder", "folder"));
		}else{
			/** @type {string} */
			var b_sfx = getSfx(b_fnm);
			if(g_imagetypes[b_sfx]){
				b_span.appendChild(createSvg("image", "fgreen"));
			}else if(g_videotypes[b_sfx]){
				b_span.appendChild(createSvg("video", "fpink"));
			}else{
				b_span.appendChild(createSvg("file", "fyellow"));
			}
		}
		b_span.addEventListener("click", clickIcon);
		b_td.appendChild(b_span);
	}
	b_link.innerText = b_fnm;
	b_link.href = "#";
	b_link.setAttribute("uid", itm._id);
	b_link.setAttribute("utype", /** @type {string} */(itm._type));
	b_link.addEventListener("click", /** @type {function(Event)} */(clickItem));
	b_td.appendChild(b_link);
	if(!fonly){
		b_btn.appendChild(createSvg("edit"));
		b_btn.classList.add("dropbtn");
		b_btn.addEventListener("click", showDropdown);
		b_td.appendChild(b_btn);
	}
	b_tr.appendChild(b_td);
	if(!fonly){
		b_td = document.createElement("td");
		b_td.innerText = getSizeDisp(/** @type {number} */(itm._size));
		b_td.setAttribute("class", "right");
		b_tr.appendChild(b_td);
		b_td = document.createElement("td");
		b_td.innerText = getTimestampDisp(/** @type {string} */(itm._lastModifiedDateTime));
		b_tr.appendChild(b_td);
	}
	tby.appendChild(b_tr);
}
/**
 * @param {Event} evt
 */
function clickIcon(evt){
	var btn = /** @type {Element} */(getElement(evt));
	if(btn.tagName != "SPAN"){
		btn = findParent(btn, "SPAN");
	}
	var chk = previousElement(btn, "INPUT");
	if(chk){
		chk.click();
	}
}
/**
 * Event called from html
 * @param {number|Event=} direction
 * @param {boolean=} noLoop
 *
 * direction: 1 previous, 2 next, self if omitted.
 */
function clickItem(direction, noLoop){
	/** @type {Element} */
	var ele = null;
	/** @type {Element} */
	var tbdy = null;
	/** @type {HTMLCollection} */
	var rows = null;
	/** @type {number} */
	var rowidx = 0
	if(direction && !(direction instanceof Event)){
		tbdy = getTableBody("#tblFileDetail")._tbody;
		rows = /** @type {HTMLCollection} */(getTableBody("#tblst")._tbody.rows);
		rowidx = tbdy.rows[0].getAttribute("rowidx");
		if(direction == 1){
			if(rowidx > 0){
				rowidx--;
			}else if(noLoop){
				return;
			}else{
				rowidx = rows.length - 1;
			}
		}else{
			rowidx++;
			if(rowidx >= rows.length){
				if(noLoop){
					return;
				}else{
					rowidx = 0;
				}
			}
		}
		ele = rows[rowidx].getElementsByTagName("a")[0];
		// Skip folder
		if(isFolder(ele)){
			tbdy.rows[0].setAttribute("rowidx", rowidx);
			clickItem(direction);
			return;
		}
	}else{
		window.event.preventDefault();
		ele = /** @type {Element} */(getElement());
		if(isFolder(ele)){
			/** @type {Element} */
			var tbl = findParent(ele, "TABLE");
			if(tbl.getAttribute("onlyfolder")){
				listFolder(false, true, {
					_id: ele.getAttribute("uid"),
					_name: ele.innerText,
				});
			}else{
				g_paths.push({
					_id: ele.getAttribute("uid"),
					_name: ele.innerText,
				});
				listFolder();
			}
			return;
		}else{
			tbdy = getTableBody("#tblFileDetail")._tbody;
			rows = /** @type {HTMLCollection} */(getTableBody("#tblst")._tbody.rows);
			rowidx = findParent(ele, "TR").rowIndex - rows[0].rowIndex;
		}
	}
	tbdy.rows[0].cells[1].getElementsByTagName("span")[0].innerText = ele.innerText;
	tbdy.rows[0].setAttribute("uid", ele.getAttribute("uid"));
	tbdy.rows[0].setAttribute("rowidx", rowidx);
	tbdy.rows[1].cells[0].innerText = window["msgs"]["thSize"] + ": " + rows[rowidx].cells[1].innerText;

	viewFile(ele.getAttribute("uid"), ele.innerText);
}
/**
 * Event called from html
 */
function clickPath(){
	window.event.preventDefault();
	/** @type {Element} */
	var ele = /** @type {Element} */(getElement());
	/** @type {Element} */
	var tbl = findParent(ele, "TABLE");
	/** @type {Element} */
	var th = tbl.getElementsByTagName("th")[0];
	if(tbl.getAttribute("onlyfolder")){
		/** @type {number} */
		var cnt = 0;
		/** @type {Element} */
		var next = ele.nextElementSibling;
		while(next){
			if(next.tagName == ele.tagName){
				cnt++;
			}
			next = next.nextElementSibling
		}
		if(cnt > 0){
			for(var i=0; i<cnt; i++){
				th.removeChild(th.lastElementChild);
				th.removeChild(th.lastElementChild);
			}
		}
		listFolder(true, true, {
			_name: ele.innerText,
			_id : ele.getAttribute("uid"),
		});
	}else{
		/** @type {number} */
		var idx = parseInt(ele.getAttribute("idx"), 10);
		if(idx < g_paths.length - 1){
			/** @type {Array<DriveItem>} */
			var darr = g_paths.splice(idx + 1);
			darr.forEach(/** function(DriveItem) */function(a_ele){
				th.removeChild(th.lastElementChild);
				th.removeChild(th.lastElementChild);
			});
		}
		listFolder(true);
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
 * @param {string} fnm
 * @return {string}
 */
function getSfx(fnm){
	/** @type {number} */
	var pos = fnm.lastIndexOf(".");
	/** @type {string} */
	var sfx = "";
	if(pos >= 0){
		sfx = fnm.slice(pos + 1);
	}
	return sfx.toLowerCase();
}
/**
 * Event called from html
 */
function selectAll(){
	/** @type {boolean} */
	var chkd = getElement().checked;
	/** @type {!NodeList<!Element>} */
	var eles = getTableBody("#tblst")._tbody.getElementsByTagName("input");
	for(var i=0; i<eles.length; i++){
		if(eles[i].type == "checkbox"){
			eles[i].checked = chkd;
		}
	}
}
/**
 * @param {number} typ
 *
 * typ: 1 show dropdown, 2 show file detail, 3 show folder selector
 */
function showGround(typ){
	/** @type {Element} */
	var div = document.getElementById("divGround");
	if(typ == 1){
		div.style.backgroundColor = "transparent";
		document.getElementById("tblFileDetail").parentElement.style.display = "none";
	}else{
		div.style.backgroundColor = "";
		document.getElementById("tblFileDetail").parentElement.style.display = "";
		if(typ == 2){
			document.getElementById("spanGroundTitle").innerText = window["msgs"]["gtlFDetail"];
			document.getElementById("tblFileDetail").style.display = "";
		}else{
			document.getElementById("tblFileDetail").style.display = "none";
		}
		if(typ == 3){
			document.getElementById("spanGroundTitle").innerText = window["msgs"]["gtlMoveto"];
			/** @type {Element} */
			var tbl = document.getElementById("tblFolder");
			tbl.getElementsByTagName("th")[0].innerHTML = null;
			tbl.style.display = "";
		}else{
			document.getElementById("tblFolder").style.display = "none";
		}
	}

	div.style.display = "table";
}
/**
 * Event called from html
 */
function showDropdown(){
	/** @type {Element} */
	var btn = /** @type {Element} */(getElement());
	/** @type {HTMLCollection} */
	var rows = getTableBody("#tblst")._tbody.rows;
	/** @type {number} */
	var rowidx = findParent(btn, "TR").rowIndex - rows[0].rowIndex;
	/** @type {Element} */
	var menu = document.getElementById("divItemenu");
	/** @type {DOMRect} */
	var rect = btn.getBoundingClientRect();
	menu.style.left = rect.right + "px";
	menu.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) + rect.top) + "px";
	menu.style.display = "block";
	menu.setAttribute("rowidx", rowidx);
	showGround(1);
}
/**
 * @return {HTMLElement}
 */
function getMenuTarget(){
	/** @type {Element} */
	var div = document.getElementById("divItemenu");
	/** @type {HTMLCollection} */
	var rows = getTableBody("#tblst")._tbody.rows;
	/** @type {number} */
	var rowidx = parseInt(div.getAttribute("rowidx"), 10);
	return rows[rowidx].getElementsByTagName("a")[0];
}
/**
 * Event called from html
 */
function clickMenu(){
	/** @type {Element} */
	var ele = /** @type {Element} */(getElement());
	/** @type {Element} */
	var div = findParent(ele, "DIV");
	/** @type {Element} */
	var lnk = getMenuTarget();
	div.style.display = "";
	switch(ele.getAttribute("wordid")){
	case "btnDownload":
		if(isFolder(lnk)){
			showError("noDownFolder");
		}else{
			div.setAttribute("uid", lnk.getAttribute("uid"));
			div.setAttribute("uname", lnk.innerText);
			download(2);
		}
		hideGround();
		break;
	case "btnRename":
		/** @type {Element} */
		var div1 = document.getElementById("divNewName");
		/** @type {Element} */
		var txt = div1.getElementsByTagName("input")[0];
		/** @type {DOMRect} */
		var rect = lnk.getBoundingClientRect();
		txt.value = lnk.innerText;
		div1.style.left = rect.left + "px";
		div1.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) + rect.top - 2) + "px";
		txt.style.width = rect.width + "px";
		txt.style.height = rect.height + "px";
		div1.style.display = "block";
		txt.focus();
		return;
	case "btnMove":
		showMove(lnk.getAttribute("uid"));
		break;
	case "btnDelete":
		deleteItems(lnk.getAttribute("uid"));
		hideGround();
		break;
	}
}
/**
 * @param {string|Event} uid
 */
function showMove(uid){
	if(typeof uid == "string"){
		document.getElementById("tblFolder").setAttribute("uid", uid);
	}else if(getMultiChecked()){
		document.getElementById("tblFolder").removeAttribute("uid");
	}else{
		return;
	}
	showGround(3);
	listFolder(false, true, g_paths[0]);
}
/**
 * Event called from html
 * @return {boolean}
 */
function keyupNewname(){
	/** @type {Event} */
	var evt = window.event;
	if(evt.keyCode === 13){ // Enter Key
		if(evt.shiftKey || evt.ctrlKey || evt.altKey){
			return true;
		}
	}else if(evt.keyCode === 27){ // Esc Key
		hideGround();
		return false;
	}else{
		return true;
	}
	admitRename();
	return false;
}
/**
 * Event called from html
 */
function admitRename(){
	/** @type {Element} */
	var txt = /** @type {Element} */(getElement());
	if(txt.tagName != "INPUT"){
		txt = previousElement(txt, "INPUT");
	}
	if(!txt.value){
		showError("noNewName");
		return;
	}
	/** @type {Element} */
	var div = document.getElementById("divItemenu");
	/** @type {HTMLCollection} */
	var rows = getTableBody("#tblst")._tbody.rows;
	/** @type {number} */
	var rowidx = parseInt(div.getAttribute("rowidx"), 10);
	/** @type {Element} */
	var lnk = rows[rowidx].getElementsByTagName("a")[0];
	if(txt.value != lnk.innerText){
		/** @type {string} */
		var fnm = encryptFname(txt.value);
		/** @type {DriveUpdateOption} */
		var opt = {
			/** @type {function((boolean|DriveJsonRet))} */
			_doneFunc: function(a_err){
				if(a_err){
					showError(a_err._restext);
					return;
				}
				lnk.innerText = txt.value;
				showNotify("renDone");
			},
			/** @type {string} */
			_fid: lnk.getAttribute("uid"),
			/** @type {string} */
			_newname: fnm,
		}
		g_drive.rename(opt);
	}
	hideGround();
}
/**
 * Event called from html
 */
function moveToFolder(){
	hideGround();

	/** @type {Element} */
	var tbl = document.getElementById("tblFolder");
	/** @type {Element} */
	var th = tbl.getElementsByTagName("th")[0];
	/** @type {Element} */
	var lnk = previousElement(th, "a", true);
	/** @type {string} */
	var pntid = lnk.getAttribute("uid") ;
	if(pntid == g_paths[g_paths.length - 1]._id){
		return;
	}

	var arr = null;
	/** @type {string} */
	var uid = tbl.getAttribute("uid");
	if(uid){
		arr = /** @type {Array<DriveItem>} */(new Array());
		arr.push({
			_id: uid,
			_name: "",
		});
	}else{
		arr = getMultiChecked();
	}
	if(!arr){
		return;
	}

	showInfo("moving");
	/** @type {number} */
	var idx = 0;
	/** @type {DriveUpdateOption} */
	var opt = {
		/** @type {function((boolean|DriveJsonRet))} */
		_doneFunc: function(a_err){
			if(a_err){
				showError(a_err._restext);
				return;
			}
			idx++;
			if(idx < arr.length){
				opt._fid = arr[idx]._id;
				g_drive.move(opt);
			}else{
				listFolder(true);
				showNotify("moveDone");
			}
		},
		/** @type {string} */
		_fid: arr[idx]._id,
		/** @type {string} */
		_parentid: pntid,
		/** @type {string} */
		_oldparentid: g_paths[g_paths.length - 1]._id,
	}
	g_drive.move(opt);
}
/**
 * Event called from html
 * @param {string|Event} uid
 */
function deleteItems(uid){
	var arr = null;
	if(typeof uid == "string"){
		arr = /** @type {Array<DriveItem>} */(new Array());
		arr.push({
			_id: uid,
			_name: "",
		});
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
	/** @type {number} */
	var idx = 0;
	/** @type {DriveUpdateOption} */
	var opt = {
		/** @type {function((boolean|DriveJsonRet))} */
		_doneFunc: function(a_err){
			if(a_err){
				showError(a_err._restext);
				return;
			}
			idx++;
			if(idx < arr.length){
				opt._fid = arr[idx]._id;
				g_drive.delete(opt);
			}else{
				listFolder(true);
				showNotify("delDone");
			}
		},
		/** @type {string} */
		_fid: arr[idx]._id,
	}
	g_drive.delete(opt);
}
/**
 * Event called from html
 */
function newFolder(){
	/** @type {string} */
	var fldnm = document.getElementById("txtName").value;
	if(!fldnm){
		showError("noFldName");
		return;
	}
	/** @type {DriveNewFolderOption} */
	var opt = {
		/** @type {function((boolean|DriveJsonRet), DriveItem=)} */
		_doneFunc: function(a_err, a_dat){
			if(a_err){
				showError(a_err._restext);
				return;
			}
			a_dat._name = fldnm;
			addItem(getTableBody("#tblst")._tbody, a_dat);
			showNotify("flDone");
		},
		/** @type {string} */
		_folder: encryptFname(fldnm),
	}
	if(g_paths.length > 0){
		opt._parentid = g_paths[g_paths.length - 1]._id;
	}
	g_drive.newFolder(opt);
}
/**
 * @param {boolean=} noFolder
 * @return {?Array<DriveItem>}
 */
function getMultiChecked(noFolder){
	/** @type {Array<DriveItem>} */
	var files = new Array();
	/** @type {!NodeList<!Element>} */
	var eles = getTableBody("#tblst")._tbody.getElementsByTagName("input");
	for(var i=0; i<eles.length; i++){
		/** @type {Element} */
		var e = eles[i];
		if(e.type == "checkbox" && e.checked){
			/** @type {Element} */
			var lnk = nextElement(e, "a");
			if(noFolder && isFolder(lnk)){
				showError("noDownFolder");
				return null;
			}else{
				files.push({
					_name: lnk.innerText,
					_id: lnk.getAttribute("uid"),
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
 */
function viewFile(fid, fnm){
	/** @type {Element} */
	var tbdy = getTableBody("#tblFileDetail")._tbody;
	showGround(2);

	/** @type {string} */
	var sfx = getSfx(fnm);
	/** @type {Element} */
	var span = tbdy.rows[0].cells[1].getElementsByTagName("span")[0];
	/** @type {Element} */
	var img = tbdy.rows[0].cells[1].getElementsByTagName("img")[0];
	/** @type {string} */
	var imgType = g_imagetypes[sfx];
	/** @type {string} */
	var vdoType = g_videotypes[sfx];
	/** @type {Element} */
	var spanTitle = document.getElementById("spanGroundTitle");
	spanTitle.innerText = window["msgs"]["gtlFDetail"];
	span.style.display = "";
	img.style.display = "none";
	img.src = "";
	/** @type {Element} */
	var vdo = endVideoStream(tbdy);
	tbdy.rows[1].style.display = "";
	tbdy.rows[2].style.display = "";
	if(vdoType){
		spanTitle.innerText = fnm;
		playVedio(vdo, fid, fnm);
		vdo.style.display = "";
		span.style.display = "none";
		tbdy.rows[1].style.display = "none";
		tbdy.rows[2].style.display = "none";
		return;
	}else if(!imgType){
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
	cypt.onfinal = /** @type {function(*=, boolean=)} */(function(a_err, a_canceled){
		if(a_err || a_canceled){
			console.log(a_err || a_canceled);
			return;
		}
		var a_buf = writer.getBuffer();
		if(!(a_buf instanceof Uint8Array)){
			a_buf = new Uint8Array(a_buf);
		}
		if(imgType){
//			var a_words = new CryptoJS.lib.WordArray.init(a_buf);
//			img.src = "data:"+imgType+";base64," + a_words.toString(CryptoJS.enc.Base64);
			var a_blob = new Blob([a_buf], { "type" : imgType });
			img.src = window.URL.createObjectURL(a_blob);
			img.title = fnm;
			img.style.display = "";
			span.style.display = "none";
			spanTitle.innerText = fnm;
			tbdy.rows[1].style.display = "none";
			tbdy.rows[2].style.display = "none";
		}
	});
	cypt.start();
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
 * @param {Element} vdo
 * @param {string} fid
 * @param {string} fnm
 */
function playVedio(vdo, fid, fnm){
	/** @type {ZBReader} */
	var reader = g_drive.createReader({
		_id: fid,
	});
	const VdoStrm = /** @type {typeof VideoStream} */(zb_require("videostream"));
	/** @type {string} */
	vdo.fid = fid;
	/** @type {string} */
	vdo.fnm = fnm;
	/** @type {ZbStreamWrapper} */
	vdo.wrapper = new ZbStreamWrapper({
		_decrypt: true,
		_keycfg: g_keycfg,
		_reader: reader,
	});
//	vdo.addEventListener("error", function(err){
//		console.error(err);
//		console.error(err.target.strm.detailedError);
//	});
	/** @type {VideoStream} */
	vdo.vstrm = new VdoStrm(vdo.wrapper, vdo);
}
/**
 * Event called from html
 * In the case of google chrome, the data source url may be corrupted, so need to recreate it.
 * @param {Event} errevt
 */
function resetVideoSrc(errevt){
	var vdo = /** @type {Element} */(errevt.target);
	var vstrm = /** @type {VideoStream} */(vdo.vstrm);
	if(vstrm){
		if(vstrm.detailedError){
			return;
		}
	}else{
		return;
	}
	if(vstrm._elemWrapper && vstrm._elemWrapper._mediaSource){
		errevt.stopImmediatePropagation();
		vdo.src = window.URL.createObjectURL(vstrm._elemWrapper._mediaSource);
	}
}

/**
 * Event called from html
 */
function hideGround(){
	document.getElementById("divGround").style.display = "";
	endVideoStream();
	document.getElementById("divItemenu").style.display = "";
	document.getElementById("divNewName").style.display = "";
}
/**
 * @param {Element=} tbdy
 * @return {Element}
 */
function endVideoStream(tbdy){
	if(!tbdy){
		tbdy = getTableBody("#tblFileDetail")._tbody;
	}
	/** @type {Element} */
	var vdo = tbdy.rows[0].cells[1].getElementsByTagName("video")[0];
	if(vdo.fid){
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
				g_recents[i]._time = vdo.currentTime;
				break;
			}
		}
		if(i == g_recents.length){
			g_recents.push({
				_fid: vdo.fid,
				_folder: parentid,
				_time: vdo.currentTime,
			});
		}
		delete vdo.fid;
		delete vdo.fnm;
		g_storage.saveRecent(g_recents[i], i);
		setRecent(i, fnm);
	}
	vdo.style.display = "none";
	if(vdo.vstrm){
		vdo.vstrm.destroy();
		vdo.wrapper.destroyStream();
		delete vdo.vstrm;
		delete vdo.wrapper;
	}
	return vdo;
}
/**
 * @param {Event} evt
 */
function clickRecent(evt){
	window.event.preventDefault();
	/** @type {EventTarget} */
	var lnk = getElement(evt);
	playRecent(lnk);
}
/**
 * @param {Event} evt
 */
function clickRecentNext(evt){
	var btn = /** @type {Element} */(getElement(evt));
	/** @type {Element} */
	var p = findParent(btn, "P");
	/** @type {Element} */
	var lnk = p.getElementsByTagName("a")[0];
	playRecent(lnk, true);
}
/**
 * @param {EventTarget} lnk
 * @param {boolean=} next
 */
function playRecent(lnk, next){
	document.getElementById("divHistory").style.display = "";

	/** @type {string} */
	var fid = lnk.getAttribute("fid");
	if(!fid){
		return;
	}
	/** @type {string|undefined} */
	var pnt = lnk.getAttribute("parentId");
	/** @type {string} */
	var ctime = lnk.getAttribute("time");
	// locate folder
	showInfo("loading");
	/** @type {Array<DriveItem>} */
	var paths = new Array();
	/** @type {function()} */
	var getDrvFld = function(){
		if(!pnt){
			showInfo();
			return;
		}
		g_drive.getItem({
			/** @type {string} */
			_uid: pnt,
			/** @type {function((boolean|DriveJsonRet), DriveItem=)} */
			_doneFunc: function(a_err, a_dat){
				if(!a_err){
					a_dat._name = decryptFname(a_dat._name);
					paths.unshift(a_dat);
					if(a_dat._parentId == g_paths[0]._id){
						paths.unshift(g_paths[0]);
						gotoPlay();
					}else{
						if(a_dat._parentId == g_paths[0]._parentId){
							// The recent file is not in this root folder.
							pnt = undefined;
						}else{
							pnt = a_dat._parentId;
						}
						getDrvFld();
					}
				}
			},
		});
	};
	/** @type {function()} */
	var gotoPlay = function(){
		/** @type {number} */
		var a_i = 0;
		/** @type {Element} */
		var a_th = getTableBody("#tblst")._table.getElementsByTagName("th")[0];
		a_th.innerHTML = "";
		for(a_i = 0; a_i < paths.length; a_i++){
			addPath(a_th, paths[a_i], a_i, true);
		}
		g_paths = paths;
		listFolder(true, false, undefined,  /** @type {function(Array<DriveItem>)} */(function(b_arr){
			/** @type {number} */
			var b_i = 0;
			for(b_i = 0; b_i < b_arr.length; b_i++){
				if(b_arr[b_i]._id == fid){
					break;
				}
			}
			if(b_i < b_arr.length){
				/** @type {Element} */
				var b_row = getTableBody("#tblFileDetail")._tbody.rows[0];
				if(next){
					b_row.setAttribute("rowidx", b_i);
					clickItem(2, true);
				}else{
					b_row.getElementsByTagName("video")[0].setAttribute("ctime", ctime);
					if(b_i == 0){
						b_row.setAttribute("rowidx", 1);
						clickItem(1, true);
					}else{
						b_row.setAttribute("rowidx", b_i - 1);
						clickItem(2, true);
					}
				}
			}
			
		}));
	};
	getDrvFld();
}
/**
 * @param {Event} evt
 */
function restoreTime(evt){
	/** @type {EventTarget} */
	var vdo = getElement(evt);
	/** @type {string} */
	var ctime = vdo.getAttribute("ctime");
	if(ctime){
		vdo.removeAttribute("ctime");
		vdo.currentTime = ctime;
	}
}
/**
 * @param {Event} evt
 */
function clickDeleteRecent(evt){
	var btn = /** @type {Element} */(getElement(evt));
	/** @type {Element} */
	var p = findParent(btn, "P");
	/** @type {Element} */
	var div = findParent(p, "DIV");
	/** @type {!NodeList<!Element>} */
	var eles = div.getElementsByTagName("p");
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		if(eles[i] == p){
			break;
		}
	}
	p.remove();
	g_recents.splice(i, 1);
	g_storage.removeRecent(i);
	if(g_recents.length == 0){
		findParent(div, "DIV").style.display = "";
	}
}

const g_AUTHURL = "/grantauth.php";
const g_LANGUAGES = {
	"en": "English",
	"ja": "日本語",
};
const g_DRIVES = {
	"onedrive": {
		"name": "Microsoft OneDrive",
	},
};
const g_CONFILE = "_zgayard_.conf";
// Key name of local storage
const g_LSNM = "zgayard1946";
const g_HASHKEY = "zgayard";

var g_storage = null;
var g_saveStorage = false;
var g_msgs = null;
var g_drive = null;
var g_accessToken = null;
var g_conf = null;
var g_keycfg = null;
var g_paths = new Array();
var g_hdlNotify = 0;

function showError(msg){
	var ele = document.getElementById("spanError");
	if(g_msgs && msg && g_msgs[msg]){
		ele.innerText = g_msgs[msg];
	}else{
		ele.innerText = msg;
	}
	document.getElementById("spanInfo").style.display = "none";
	if(msg){
		ele.style.display = "block";
	}else{
		ele.style.display = "none";
	}
}
function showInfo(msg){
	var ele = document.getElementById("spanInfo");
	if(g_msgs && msg && g_msgs[msg]){
		ele.innerText = g_msgs[msg];
	}else{
		ele.innerText = msg;
	}
	document.getElementById("spanError").style.display = "none";
	if(msg){
		ele.style.display = "block";
	}else{
		ele.style.display = "none";
	}
}
function showNotify(msg){
	var ele = document.getElementById("spanNotify");
	if(g_msgs && msg && g_msgs[msg]){
		ele.innerText = g_msgs[msg];
	}else{
		ele.innerText = msg;
	}
	if(msg){
		if(g_hdlNotify){
			clearTimeout(g_hdlNotify);
			g_hdlNotify = 0;
		}
		ele.style.display = null;
		g_hdlNotify = setTimeout(function(){
			ele.style.display = "none";
			g_hdlNotify = 0;
		}, 3000);
	}
}
function loadjsend(evt, func){
	loadjs.count--;
	if(evt.type == "error"){
		loadjs.err = true;
	}
	if(loadjs.count == 0){
		var err = loadjs.err;
		delete loadjs.err;
		if(func){
			func(err);
		}
	}
	var script = evt.target || evt.srcElement;
	if(script.hasAttribute("temporary")){
		script.remove();
	}
}
function loadjs(js, func, remove){
	loadjs.count++;
	var endfunc = function(a_evt){
		loadjsend(a_evt, func);
	};
	var script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", js);
	if(remove){
		script.setAttribute("temporary", "1");
	}
	script.addEventListener("load", endfunc);
	script.addEventListener("error", endfunc);
	document.body.appendChild(script);
}
loadjs.count = 0;

function onbody(){
	loadjs("zb/vendor/crypto-js.js", onbody2);
	loadjs("zb/vendor/videostream.js", onbody2);
	loadjs("zb/zbcommon.js", onbody2);
	loadjs("zb/zbcrypto.js", onbody2);
	loadjs("zb/zbonedrive.js", onbody2);
}
function onbody2(err){
	if(err){
		showError("JavaScript resources are missing.");
		return;
	}

	window.addEventListener("scroll", function(){
		document.getElementById("divGround").style.top = (document.documentElement.scrollTop || document.body.scrollTop) + "px";
	});
	document.getElementById("spanNotify").style.display = "none";
	// "input file multiple" is not supported in Android, so we need to add "input file" manually.
	var reg = new RegExp("android", "i");
	if(!reg.test(navigator.userAgent)){
		document.getElementById("spanMoreKey").style.display = "none";
		document.getElementById("spanClearKey").style.display = "none";
	}

	if(window.indexedDB){
		var request = window.indexedDB.open(g_LSNM);
		request.onerror = function(a_evt){
			showError("IndexedDB is not supported in your browser settings.");
			onbody3();
		};
		request.onupgradeneeded = function(a_evt){
			var a_db = a_evt.target.result;
			var a_store = a_db.createObjectStore("settings", {
				"keyPath": "key"
			});
//			a_store.transaction.oncomplete = function(b_evt){
//				console.log("aa");
//			};
		};
		request.onsuccess = function(a_evt){
			var a_db = a_evt.target.result;
			var a_trans = a_db.transaction("settings", "readwrite");
			a_trans.oncomplete = function(b_evt){
				a_db.close();
				onbody3();
			};
			var a_store = a_trans.objectStore("settings");
			var a_req = a_store.getAll();
			a_req.onsuccess = function(b_evt){
				g_storage = new Object();
				b_evt.target.result.forEach(function(c_ele, c_idx){
					g_storage[c_ele["key"]] = c_ele["value"];
				});
			};
		};
	}else{
		showError("IndexedDB is not supported in your browser settings.");
	}
}

function saveLocalStorage(){
	if(g_saveStorage){
		if(g_storage){
			if(!g_storage["skipLogin"]){
				delete g_storage["refresh_token"];
			}
			var request = window.indexedDB.open(g_LSNM);
			request.onsuccess = function(a_evt){
				var a_db = a_evt.target.result;
				var a_trans = a_db.transaction("settings", "readwrite");
				a_trans.oncomplete = function(b_evt){
					a_db.close();
				};
				var a_store = a_trans.objectStore("settings");
				var a_req = a_store.clear();
				a_req.onsuccess = function(b_evt){
					Object.keys(g_storage).forEach(function(c_ele){
						a_store.put({"key": c_ele, "value": g_storage[c_ele]});
					});
				};
			};
		}
		g_saveStorage = false;
	}
}
function saveKeyData(keyWords){
	if(!g_storage){
		return;
	}

	var saveToDb = function(){
		window.indexedDB.open(g_LSNM).onsuccess = function(a_evt){
			var a_db = a_evt.target.result;
			var a_trans = a_db.transaction("settings", "readwrite");
			a_trans.oncomplete = function(b_evt){
				a_db.close();
			};
			var a_store = a_trans.objectStore("settings");
			if(g_storage["key_words"]){
				a_store.put({"key": "key_words", "value": g_storage["key_words"]});
			}else{
				a_store.delete("key_words");
			}
		};
	};

	delete g_storage["key_words"];
	if(document.getElementById("chkSaveKey").checked){
		fetchLocalStorageAuth(function(a_lskdat){
			if(a_lskdat && a_lskdat["lsauth"]){
				var a_dat = zbDataCrypto(true, keyWords, a_lskdat["lsauth"]);
				g_storage["key_words"] = a_dat.toString(CryptoJS.enc.Base64);
			}
			saveToDb();
		});
	}else{
		saveToDb();
	}
}
// Get authorization of local storage
function fetchLocalStorageAuth(func){
	var formData = new FormData();
	formData.append("drive_type", "localstorage");
	var ajax = new XMLHttpRequest();
	ajax.open("POST", g_AUTHURL, true);
	ajax.onload = function(a_evt){
		var a_x = a_evt.target;
		if(a_x.readyState == 4){
			var a_ret = null;
			if(a_x.status == 200){
				var a_resp =JSON.parse(a_x.responseText);
				if(a_resp){
					if(a_resp["error"]){
						showError("["+a_resp["error"]+"] "+a_resp["error_description"]);
					}else if(a_resp["lsauth"]){
						a_ret = a_resp;
					}else{
						showError("lsFailed");
					}
				}else{
					showError("lsFailed");
				}
			}else{
				showError(a_x.responseText+" ("+a_x.status+")");
			}
			if(func){
				func(a_ret);
			}
		}
	};
	ajax.send(formData);
}

function onbody3(){
	var lang = navigator.language;
	if(g_storage && g_storage["language"]){
		lang = g_storage["language"];
	}else{
		var i = lang.indexOf("-");
		if(i > 0){
			lang = lang.substring(0, i);
		}
	}
	changeLanguage(lang);
}
function showSettings(){
	document.getElementById("divSet").style.display = "block";
}
function changeLanguage(lang){
	// Define messages
	var old_msgs = g_msgs;
	g_msgs = null;
	loadjs("msg/"+lang+".js", function(a_err){
		if(g_msgs){
			if(g_storage){
				g_storage["language"] = lang;
			}
			applyLanguage(g_msgs, lang);
		}else{
			console.log("Message file of '"+lang+"' is missing.");
			if(old_msgs){
				g_msgs = old_msgs;
			}else{
				loadjs("msg/en.js", function(b_err){
					if(g_msgs){
						if(g_storage){
							g_storage["language"] = "en";
						}
						applyLanguage(g_msgs, "en");
					}else{
						showError("Message file is missing.");
					}
				}, true);
			}
		}
	}, true);
}
function applyLanguage(msgs, lang){
	// Patch message
	msgs["spanConfNotice"] = msgs["spanConfNotice"].replace("{0}", g_CONFILE);
	// Set text for all elements
	var eles = document.getElementsByTagName("*");
	for(var ii=0; ii<eles.length; ii++){
		var ele = eles[ii];
		var word = null;
		if(ele.hasAttribute("wordid")){
			word = msgs[ele.getAttribute("wordid")];
		}
		if(!word && ele.id){
			word = msgs[ele.id];
		}
		if(word){
			if(ele.type == "button"){
				ele.value = word;
			}else{
				ele.innerText = word;
			}
		}
	}

	// Settings of language
	var sel = document.getElementById("seLang");
	for(var ii in g_LANGUAGES){
		var opt = document.createElement("option");
		opt.value = ii;
		opt.innerText = g_LANGUAGES[ii];
		if(ii == lang){
			opt.selected = true;
		}
		sel.appendChild(opt);
	}
	// Settings of drive
	sel = document.getElementById("selDrive");
	for(var ii in g_DRIVES){
		var opt = document.createElement("option");
		opt.value = ii;
		opt.innerText = g_DRIVES[ii]["name"];
		if(g_storage && g_storage["drive"] == ii){
			opt.selected = true;
		}
		sel.appendChild(opt);
	}

	if(g_storage){
		document.getElementById("divSkipLogin").style.display = "block";
		document.getElementById("divSaveKey").style.display = "block";
		if(g_storage["refresh_token"]){
			document.getElementById("chkSkipLogin").checked = true;
		}
		if(g_storage["key_words"]){
			document.getElementById("chkSaveKey").checked = true;
		}
	}

	// Determine drive
	if(g_storage && g_storage["drive"]){
		loadDrive(g_storage["drive"]);
	}else{
		var uparams  = analyzeUrlParams(window.location.search);
		if(uparams && uparams["drive_type"]){
			loadDrive(uparams["drive_type"]);
		}else{
			document.getElementById("divSet").style.display = "block";
		}
	}
}

function loadDrive(drv){
	showInfo("loading");
	switch(drv){
		case "onedrive":
			g_drive = new ZbOneDrive();
			break;
		default:
			showError("unkDrive");
			return;
	}
	if(g_storage){
		g_storage["drive"] = drv;
	}

	if(g_drive.login(true)){
		saveLocalStorage();
	}else{
		return;
	}

	// Get configuration file.
	g_drive.getItem({
		"auth": g_accessToken,
		"doneFunc": function(a_err, a_dat){
			if(a_err){
				if(a_err["status"] == 404){
					showInputPassword(true);
				}else{
					showError(JSON.stringify(a_err));
				}
			}else{
				downloadConfile(a_dat["id"]);
			}
		},
		"upath": g_CONFILE,
	});
}
function saveSettings(){
	var skipLogin = false;
	if(g_storage){
		if(document.getElementById("chkSkipLogin").checked){
			skipLogin = true;
		}
		g_storage["skipLogin"] = skipLogin;
	}
	changeLanguage(document.getElementById("seLang").value);
	if(!(g_storage && g_storage["drive"] == document.getElementById("selDrive").value)){
		if(g_storage){
			sessionStorage.clear();
		}
		loadDrive(document.getElementById("selDrive").value);
	}
	g_saveStorage = true;
	saveLocalStorage();
	document.getElementById("divSet").style.display = "none";
}
function cancelSettings(){
	document.getElementById("divSet").style.display = "none";
}

function showInputPassword(firstep){
	var div = document.getElementById("divPwd");
	var disp = "none";
	if(firstep){
		div.setAttribute("firstep", "1");
		disp = "block";
	}else{
		div.removeAttribute("firstep");
	}

	var eles = div.getElementsByTagName("*");
	for(var ii=0; ii<eles.length; ii++){
		var ele = eles[ii];
		if(ele.classList.contains("firstep")){
			ele.style.display = disp;
		}
	}
	div.style.display = "block";
	showInfo();
}
function moreKeyf(){
	var ele = getElement();
	var inp = ele.previousElementSibling.cloneNode();
	inp.value = "";
	ele.parentElement.insertBefore(inp, ele);
}
function clearKeyf(){
	var eles = getElement().parentElement.getElementsByTagName("input");
	for(var i=eles.length-1; i>0; i--){
		eles[i].remove();
	}
	eles[0].value = "";
}
function setPassword(){
	showInfo("loading");

	var firstep = document.getElementById("divPwd").hasAttribute("firstep");
	var pwdKey = document.getElementById("pwdKey").value;
	var eles = document.getElementById("divfKey").getElementsByTagName("input");
	var fKey = new Array();
	for(var i=0; i<eles.length; i++){
		var a_fs = eles[i].files;
		for(var j=0; j<a_fs.length; j++){
			fKey.push(a_fs[j]);
		}
	}
	if(!(pwdKey || fKey.length > 0)){
		showError("noPwd");
		return;
	}
	if(firstep){
		var pwdKeyRe = document.getElementById("pwdKeyRe").value;
		if(pwdKey || pwdKeyRe){
			if(pwdKey != pwdKeyRe){
				showError("diffPwd");
				return;
			}
		}
		if(!document.getElementById("txtRoot").value){
			showError("noRoot");
			return;
		}
	}

	var words = null;
	if(pwdKey){
		words = CryptoJS.enc.Utf8.parse(pwdKey);
	}
	if(fKey.length > 0){
		var i = 0;
		var reader = new FileReader();
		var hash = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA512, "zb12");
		reader.doread = function(){
			reader.readAsArrayBuffer(fKey[i].slice(0, 1023));
			i++;
		}
		reader.onload = function(a_evt){
			hash.update(new CryptoJS.lib.WordArray.init(a_evt.target.result));
			if(i < fKey.length){
				reader.doread();
			}else{
				if(words){
					words.concat(hash.finalize());
				}else{
					words = hash.finalize();
				}
				words.clamp();
				checkPassword(words, firstep);
			}
		};
		reader.doread();
	}else{
		checkPassword(words, firstep);
	}
}
function checkPassword(keyWords, firstep){
	var hmac = CryptoJS.HmacMD5(keyWords, g_HASHKEY).toString(CryptoJS.enc.Base64).slice(0, 8);
	if(firstep){
		saveKeyData(keyWords);
		g_conf = {
			"root": document.getElementById("txtRoot").value,
		};
		if(document.getElementById("chkEncryFname").checked){
			g_conf["encfname"] = true;
		}
		var rkeys = CryptoJS.lib.WordArray.random(1024);
		g_keycfg = zbCreateCfg(rkeys);
		g_conf["iv"] = hmac.concat(cryptoRKeys(true, rkeys, keyWords));
		uploadConfile(g_conf);
	}else if(g_conf && g_conf["iv"] && hmac == g_conf["iv"].slice(0, hmac.length)){
		saveKeyData(keyWords);
		var rkeys = cryptoRKeys(false, g_conf["iv"].slice(hmac.length), keyWords);
		g_keycfg = zbCreateCfg(rkeys);
		checkRootFolder();
	}else if(isVisible(document.getElementById("divPwd"))){
		showError("pwdError");
	}else{
		showInputPassword();
	}
}
function cryptoRKeys(encFlg, rkeys, keyWords){
	var cfg = zbCreateCfg(keyWords);
	var dat1 = null;
	if(encFlg){
		dat1 = rkeys;
	}else{
		dat1 = CryptoJS.enc.Base64.parse(rkeys);
	}
	var dat = zbDataCrypto(encFlg, dat1, cfg);
	if(encFlg){
		return dat.toString(CryptoJS.enc.Base64);
	}else{
		showInputPassword();
		return dat;
	}
}
function uploadConfile(conf){
	var words = CryptoJS.enc.Utf8.parse(JSON.stringify(conf));
	var blob = new Blob([new Uint8Array(wordArrayToBytes(words))], { "type" : "application/octet-binary" });
	var reader = new ZBlobReader({
		"blob": blob,
	});
	var writer = g_drive.createWriter({
		"auth": g_accessToken,
		"fnm": g_CONFILE,
	});
	zbPipe(reader, writer, null, checkRootFolder);
}
function downloadConfile(fid){
	var reader = g_drive.createReader({
		"auth": g_accessToken,
		"id": fid,
	});
	var writer = new ZBlobWriter();
	zbPipe(reader, writer, null, function(){
		var a_words = new CryptoJS.lib.WordArray.init(writer.getBuffer());
		g_conf = JSON.parse(a_words.toString(CryptoJS.enc.Utf8));
		if(g_storage && g_storage["key_words"]){
			fetchLocalStorageAuth(function(b_lskdat){
				if(b_lskdat && b_lskdat["lsauth"] && !b_lskdat["newkey"]){
					var b_keywords = zbDataCrypto(false, CryptoJS.enc.Base64.parse(g_storage["key_words"]), b_lskdat["lsauth"]);
					checkPassword(b_keywords);
				}else{
					showInputPassword();
				}
			});
		}else{
			showInputPassword();
		}
	});
/*	var ajax = openAjax("/".concat(g_CONFILE), {
		"method": "GET",
		"doneFunc": function(a_status, a_restext){
			g_conf = JSON.parse(a_restext);
			if(g_storage && g_storage["key_words"]){
				fetchLocalStorageAuth(function(b_lskdat){
					if(b_lskdat && b_lskdat["lsauth"] && !b_lskdat["newkey"]){
						var b_keywords = zbDataCrypto(false, CryptoJS.enc.Base64.parse(g_storage["key_words"]), b_lskdat["lsauth"]);
						checkPassword(b_keywords);
					}else{
						showInputPassword();
					}
				});
			}else{
				showInputPassword();
			}
		},
	});
	ajax.send();*/
}
function checkRootFolder(){
	document.getElementById("divPwd").style.display = "none";
	var fldr = g_conf["root"];
	// Get root folder.
	g_drive.getItem({
		"auth": g_accessToken,
		"doneFunc": function(a_err, a_dat){
			if(a_err){
				if(a_err["status"] == 404){
					// Create root folder
					g_drive.newFolder({
						"auth": g_accessToken,
						"folder": fldr,
						"doneFunc": function(b_err, b_dat){
							if(b_err){
								showError(JSON.stringify(b_err));
							}else{
								g_paths.push(b_dat);
								listFolder();
							}
						},
					});
				}else{
					showError(JSON.stringify(a_err));
				}
			}else{
				g_paths.push(a_dat);
				listFolder();
			}
		},
		"upath": fldr,
	});
}

function listFolder(reload, onlyfolder, fld){
	if(!g_accessToken){
		return;
	}

	var idx = 0;
	if(!fld){
		if(g_paths.length <= 0){
			return;
		}
		var idx = g_paths.length - 1;
		fld = g_paths[idx];
	}
	var tblid = "#tblst";
	if(onlyfolder){
		tblid = "#tblFolder";
	}

	var t = getTableBody(tblid);
	var tbl = t["table"];
	var tbdy = t["tbody"];
	tbdy.innerHTML = "";
	showInfo("loading");

	var th = tbl.getElementsByTagName("th")[0];
	var oldlnk = previousElement(th, "a", true);
	if(reload){
		if(oldlnk){
			oldlnk.classList.remove("fnormal");
		}
	}else{
		if(oldlnk){
			oldlnk.classList.add("fnormal");
		}
		var lnk = document.createElement("a");
		var span = document.createElement("span");
		lnk.href = "#";
		lnk.innerText = fld["name"];
		lnk.setAttribute("uid", fld["id"]);
		lnk.setAttribute("idx", idx);
		lnk.addEventListener("click", clickPath);
		th.appendChild(lnk);
		span.innerText = ">";
		th.appendChild(span);
	}

	g_drive.listFolder({
		"auth": g_accessToken,
		"doneFunc": function(a_err, a_arr){
			if(a_err){
				showError(a_err);
				return;
			}
			a_arr.forEach(function(b_ele, b_idx){
				if(!onlyfolder || isFolder(b_ele)){
					addItem(tbdy, b_ele, onlyfolder);
				}
			});
			if(!onlyfolder){
				tbl.style.display = "block";
				document.getElementById("divAction").style.display = "block";
			}
			showInfo();
		},
		"uid": fld["id"],
	});
}
function addItem(tby, itm, fonly){
	var b_tr = document.createElement("tr");
	var b_td = document.createElement("td");
	var b_link = document.createElement("a");
	var b_fnm = itm["name"];
	if(!fonly){
		var b_chk = document.createElement("input");
		var b_span = document.createElement("span");
		var b_btn = document.createElement("span");
	}
	if(g_conf["encfname"]){
		try{
			b_fnm = zbDecryptString(decodeURIComponent(b_fnm), g_keycfg);
		}catch(ex){
			console.error(ex);
		}
	}
	if(!fonly){
		b_chk.type = "checkbox";
		b_td.appendChild(b_chk);
		if(isFolder(itm)){
			b_span.innerHTML = "&#x1f4c1;";
		}else{
			var b_sfx = getSfx(b_fnm);
			if(g_imagetypes[b_sfx]){
				b_span.innerHTML = "&#x1f5bc;";
			}else{
				b_span.innerHTML = "&#x1f4c4;";
			}
		}
		b_td.appendChild(b_span);
	}
	b_link.innerText = b_fnm;
	b_link.href = "#";
	b_link.setAttribute("uid", itm["id"]);
	b_link.setAttribute("utype", itm["type"]);
	b_link.addEventListener("click", clickItem);
	b_td.appendChild(b_link);
	if(!fonly){
		b_btn.innerHTML = "&#x1f4dd;";
		b_btn.setAttribute("class", "dropbtn");
		b_btn.addEventListener("click", showDropdown);
		b_td.appendChild(b_btn);
	}
	b_tr.appendChild(b_td);
	if(!fonly){
		b_td = document.createElement("td");
		b_td.innerText = getSizeDisp(itm["size"]);
		b_td.setAttribute("class", "right");
		b_tr.appendChild(b_td);
		b_td = document.createElement("td");
		b_td.innerText = getTimestampDisp(itm["lastModifiedDateTime"]);
		b_tr.appendChild(b_td);
	}
	tby.appendChild(b_tr);
}

// direction: 1 previous, 2 next, self if omitted.
function clickItem(direction){
	event.preventDefault();
	var ele = null;
	var tbdy = null;
	var rows = null;
	var rowidx = 0
	if(direction && !(direction instanceof Event)){
		tbdy = getTableBody("#tblFileDetail")["tbody"];
		rows = getTableBody("#tblst")["tbody"].rows;
		var rowidx = tbdy.rows[0].getAttribute("rowidx");
		if(direction == 1){
			if(rowidx > 0){
				rowidx--;
			}else{
				rowidx = rows.length - 1;
			}
		}else{
			rowidx++;
			if(rowidx >= rows.length){
				rowidx = 0;
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
		ele = getElement();
		if(isFolder(ele)){
			var tbl = findParent(ele, "TABLE");
			if(tbl.getAttribute("onlyfolder")){
				listFolder(false, true, {
					"id": ele.getAttribute("uid"),
					"name": ele.innerText,
				});
			}else{
				g_paths.push({
					"id": ele.getAttribute("uid"),
					"name": ele.innerText,
				});
				listFolder();
			}
			return;
		}else{
			tbdy = getTableBody("#tblFileDetail")["tbody"];
			rows = getTableBody("#tblst")["tbody"].rows;
			rowidx = findParent(ele, "TR").rowIndex - rows[0].rowIndex;
		}
	}
	tbdy.rows[0].cells[1].getElementsByTagName("span")[0].innerText = ele.innerText;
	tbdy.rows[0].setAttribute("uid", ele.getAttribute("uid"));
	tbdy.rows[0].setAttribute("rowidx", rowidx);
	tbdy.rows[1].cells[0].innerText = g_msgs["thSize"] + ": " + rows[rowidx].cells[1].innerText;

	viewFile(ele.getAttribute("uid"), ele.innerText);
}
function clickPath(){
	event.preventDefault();
	var ele = getElement();
	var tbl = findParent(ele, "TABLE");
	var th = tbl.getElementsByTagName("th")[0];
	if(tbl.getAttribute("onlyfolder")){
		var cnt = 0;
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
			listFolder(true, true, {
				"name": ele.innerText,
				"id" : ele.getAttribute("uid"),
			});
		}
	}else{
		var idx = parseInt(ele.getAttribute("idx"));
		if(idx >= g_paths.length - 1){
			return;
		}
		var darr = g_paths.splice(idx + 1);
		darr.forEach(function(a_ele){
			th.removeChild(th.lastElementChild);
			th.removeChild(th.lastElementChild);
		});
		listFolder(true);
	}
}
function isFolder(f){
	var typ = null;
	if(f instanceof HTMLElement){
		typ = f.getAttribute("utype");
	}else if(typeof f == "string"){
		typ = f;
	}else{
		typ = f["type"];
	}
	return (typ == 1);
}
function getSfx(fnm){
	var pos = fnm.lastIndexOf(".");
	var sfx = null;
	if(pos >= 0){
		sfx = fnm.slice(pos + 1);
	}
	return sfx.toLowerCase();
}
// typ: 1 show dropdown, 2 show file detail, 3 show folder selector
function showGround(typ){
	var div = document.getElementById("divGround");
	if(typ == 1){
		div.style.backgroundColor = "transparent";
		document.getElementById("tblFileDetail").parentElement.style.display = "none";
	}else{
		div.style.backgroundColor = null;
		document.getElementById("tblFileDetail").parentElement.style.display = null;
		if(typ == 2){
			document.getElementById("spanGroundTitle").innerText = g_msgs["gtlFDetail"];
			document.getElementById("tblFileDetail").style.display = null;
		}else{
			document.getElementById("tblFileDetail").style.display = "none";
		}
		if(typ == 3){
			document.getElementById("spanGroundTitle").innerText = g_msgs["gtlMoveto"];
			var tbl = document.getElementById("tblFolder");
			tbl.getElementsByTagName("th")[0].innerHTML = null;
			tbl.style.display = null;
		}else{
			document.getElementById("tblFolder").style.display = "none";
		}
	}

	div.style.display = "table";
}
function showDropdown(){
	var btn = getElement();
	var rows = getTableBody("#tblst")["tbody"].rows;
	var rowidx = findParent(btn, "TR").rowIndex - rows[0].rowIndex;
	var menu = document.getElementById("divItemenu");
	var rect = btn.getBoundingClientRect();
	menu.style.left = rect.right + "px";
	menu.style.top = rect.top + "px";
	menu.style.display = "block";
	menu.setAttribute("rowidx", rowidx);
	showGround(1);
}
function getMenuTarget(){
	var div = document.getElementById("divItemenu");
	var rows = getTableBody("#tblst")["tbody"].rows;
	var rowidx = div.getAttribute("rowidx");
	return rows[rowidx].getElementsByTagName("a")[0];
}
function clickMenu(){
	var ele = getElement();
	var div = findParent(ele, "DIV");
	var lnk = getMenuTarget();
	div.style.display = null;
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
		var div = document.getElementById("divNewName");
		var txt = div.getElementsByTagName("input")[0];
		var rect = lnk.getBoundingClientRect();
		txt.value = lnk.innerText;
		div.style.left = rect.left + "px";
		div.style.top = (rect.top - 2) + "px";
		txt.style.width = rect.width + "px";
		txt.style.height = rect.height + "px";
		div.style.display = "block";
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
function keypressNewname(){
	var evt = event;
	if(evt.keyCode === 13){
		if(evt.shiftKey || evt.ctrlKey || evt.altKey){
			return true;
		}
	}else{
		return true;
	}
	admitRename();
	return false;
}
function admitRename(){
	var txt = getElement();
	if(txt.tagName != "INPUT"){
		txt = previousElement(txt, "INPUT");
	}
	if(!txt.value){
		showError("noNewName");
		return;
	}
	var div = document.getElementById("divItemenu");
	var rows = getTableBody("#tblst")["tbody"].rows;
	var rowidx = div.getAttribute("rowidx");
	var lnk = rows[rowidx].getElementsByTagName("a")[0];
	if(txt.value != lnk.innerText){
		var fnm = txt.value;
		if(g_conf["encfname"]){
			fnm = encodeURIComponent(zbEncryptString(fnm, g_keycfg));
		}
		var opt = {
			"auth": g_accessToken,
			"doneFunc": function(a_err){
				if(a_err){
					showError(a_err["restext"]);
					return;
				}
				lnk.innerText = txt.value;
				showNotify("renDone");
			},
			"fid": lnk.getAttribute("uid"),
			"newname": fnm,
		}
		g_drive.rename(opt);
	}
	hideGround();
}
function moveToFolder(){
	hideGround();

	var tbl = document.getElementById("tblFolder");
	var th = tbl.getElementsByTagName("th")[0];
	var lnk = previousElement(th, "a", true);
	var pntid = lnk.getAttribute("uid") ;
	if(pntid == g_paths[g_paths.length - 1]["id"]){
		return;
	}

	var arr = null;
	var uid = tbl.getAttribute("uid");
	if(uid){
		arr = new Array();
		arr.push({
			"id": uid,
		});
	}else{
		arr = getMultiChecked();
	}
	if(!arr){
		return;
	}

	showInfo("moving");
	var idx = 0;
	var opt = {
		"auth": g_accessToken,
		"doneFunc": function(a_err){
			if(a_err){
				showError(a_err["restext"]);
				return;
			}
			idx++;
			if(idx < arr.length){
				opt["fid"] = arr[idx]["id"];
				g_drive.move(opt);
			}else{
				listFolder(true);
				showNotify("moveDone");
			}
		},
		"fid": arr[idx]["id"],
		"parentid": pntid,
	}
	g_drive.move(opt);
}
function deleteItems(uid){
	var arr = null;
	if(typeof uid == "string"){
		arr = new Array();
		arr.push({
			"id": uid,
		});
	}else{
		arr = getMultiChecked();
	}
	if(!arr){
		return;
	}
	if(!confirm(g_msgs["delConfirm"])){
		return;
	}

	showInfo("deleting");
	var idx = 0;
	var opt = {
		"auth": g_accessToken,
		"doneFunc": function(a_err){
			if(a_err){
				showError(a_err["restext"]);
				return;
			}
			idx++;
			if(idx < arr.length){
				opt["fid"] = arr[idx]["id"];
				g_drive.delete(opt);
			}else{
				listFolder(true);
				showNotify("delDone");
			}
		},
		"fid": arr[idx]["id"],
	}
	g_drive.delete(opt);
}
function newFolder(){
	var fldnm = document.getElementById("txtName").value;
	if(!fldnm){
		showError("noFldName");
		return;
	}
	if(!g_accessToken){
		return;
	}
	if(g_conf["encfname"]){
		fldnm = encodeURIComponent(zbEncryptString(fldnm, g_keycfg));
	}
	var opt = {
		"auth": g_accessToken,
		"doneFunc": function(a_err, a_dat){
			if(a_err){
				showError(a_err["restext"]);
				return;
			}
			addItem(getTableBody("#tblst")["tbody"], a_dat);
			showNotify("flDone");
		},
		"folder": fldnm,
	}
	if(g_paths.length > 0){
		opt["parentid"] = g_paths[g_paths.length - 1]["id"];
	}
	g_drive.newFolder(opt);
}
function upload(){
	showInfo();
	var files = document.getElementById("upfiles").files;
	if(files.length <= 0){
		showError("noFiles");
		return;
	}
	var t = getTableBody("#tblQueue");
	var tbl = t["table"];
	var tbdy = t["tbody"];
	tbdy.innerHTML = "";
	tbl.getElementsByTagName("th")[0].innerText = g_msgs["updQueue"];
	tbl.style.display = "block";

	for(var i = 0; i < files.length; i++){
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		var span = document.createElement("span");
		var btn = document.createElement("input");
		td.innerText = files[i].name;
		tr.appendChild(td);
		td = document.createElement("td");
		span.innerText = g_msgs["waiting"];
		td.appendChild(span);
		tr.appendChild(td);
		td = document.createElement("td");
		btn.type = "button";
		btn.value = g_msgs["btnCancel"];
		btn.style.display = "none";
		btn.addEventListener("click", cancel);
		td.appendChild(btn);
		tr.appendChild(td);
		tbdy.appendChild(tr);
	}

	uploadFile(files, 0, tbdy);
}
function uploadFile(files, idx, tbdy){
	var fldid = g_paths[g_paths.length - 1]["id"];
	var fnm = files[idx].name;
	var span = tbdy.rows[idx].getElementsByTagName("span")[0];
	var btn = tbdy.rows[idx].getElementsByTagName("input")[0];
	span.innerText = "-";
	btn.style.display = "";
	if(g_conf["encfname"]){
		fnm = encodeURIComponent(zbEncryptString(fnm, g_keycfg));
	}
	var reader = new ZBlobReader({
		"blob": files[idx],
		"bufSize": 1600000,
	});
	var writer = g_drive.createWriter({
		"auth": g_accessToken,
		"fnm": fnm,
		"fldrId": fldid,
	});
	var cypt = new ZbCrypto({
		"keycfg": g_keycfg,
		"reader": reader,
		"writer": writer,
	});
	cypt.onstep = function(){
		span.innerText = cypt.calSpeed();
		if(btn.getAttribute("canceled")){
			return false;
		}else{
			return true;
		}
	};
	cypt.onfinal = function(a_err, a_canceled){
		btn.style.display = "none";
		if(a_err){
			span.innerText = a_err.message || a_err.restxt;
		}else if(a_canceled){
			for(var i=idx; i<files.length; i++){
				tbdy.rows[i].getElementsByTagName("span")[0].innerText = g_msgs["updCanceled"];
			}
			if(idx > 0){
				listFolder(true);
			}
		}else{
			span.innerText = g_msgs["upDone"];
			idx++;
			if(idx < files.length){
				uploadFile(files, idx, tbdy);
			}else{
				listFolder(true);
			}
		}
	};
	cypt.start();
}
function cancel(){
	var ele = getElement();
	ele.setAttribute("canceled", "1");
}

function getMultiChecked(noFolder){
	var files = new Array();
	var eles = getTableBody("#tblst")["tbody"].getElementsByTagName("input");
	for(var i=0; i<eles.length; i++){
		var e = eles[i];
		if(e.type == "checkbox" && e.checked){
			var lnk = nextElement(e, "a");
			if(noFolder && isFolder(lnk)){
				showError("noDownFolder");
				return;
			}else{
				files.push({
					"name": lnk.innerText,
					"id": lnk.getAttribute("uid"),
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
function download(typ){
	showInfo();
	var files = new Array();
	switch(typ){
	case 1:
		var tr = getTableBody("#tblFileDetail")["tbody"].rows[0];
		files.push({
			"name": tr.getElementsByTagName("span")[0].innerText,
			"id": tr.getAttribute("uid"),
		});
		break;
	case 2:
		var div = document.getElementById("divItemenu");
		files.push({
			"name": div.getAttribute("uname"),
			"id": div.getAttribute("uid"),
		});
		break;
	default:
		files = getMultiChecked(true);
		if(!files){
			return;
		}
	}

	var t = getTableBody("#tblQueue");
	var tbl = t["table"];
	var tbdy = t["tbody"];
	tbdy.innerHTML = "";
	tbl.getElementsByTagName("th")[0].innerText = g_msgs["downQueue"];
	tbl.style.display = "block";

	for(var i = 0; i < files.length; i++){
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		var span = document.createElement("span");
		var btn = document.createElement("input");
		td.innerText = files[i].name;
		tr.appendChild(td);
		td = document.createElement("td");
		span.innerText = g_msgs["waiting"];
		td.appendChild(span);
		tr.appendChild(td);
		td = document.createElement("td");
		btn.type = "button";
		btn.value = g_msgs["btnCancel"];
		btn.style.display = "none";
		btn.addEventListener("click", cancel);
		td.appendChild(btn);
		tr.appendChild(td);
		tbdy.appendChild(tr);
	}

	downloadFile(files, 0, tbdy);
}
function downloadFile(files, idx, tbdy){
	var fnm = files[idx].name;
	var span = tbdy.rows[idx].getElementsByTagName("span")[0];
	var btn = tbdy.rows[idx].getElementsByTagName("input")[0];
	span.innerText = "-";
	btn.style.display = "";
	var reader = g_drive.createReader({
		"auth": g_accessToken,
		"id": files[idx].id,
		"bufSize": 1600000,
	});
	var writer = new ZBlobWriter({
		"downEle": document.getElementById("download"),
	});
	var cypt = new ZbCrypto({
		"decrypt": true,
		"keycfg": g_keycfg,
		"reader": reader,
		"writer": writer,
	});
	cypt.onstep = function(){
		span.innerText = cypt.calSpeed();
		if(btn.getAttribute("canceled")){
			return false;
		}else{
			return true;
		}
	};
	cypt.onfinal = function(a_err, a_canceled){
		btn.style.display = "none";
		if(a_err){
			span.innerText = a_err.message || a_err.restxt;
		}else if(a_canceled){
			for(var i=idx; i<files.length; i++){
				tbdy.rows[i].getElementsByTagName("span")[0].innerText = g_msgs["downCanceled"];
			}
		}else{
			span.innerText = g_msgs["downDone"];
			writer.download(fnm);
			idx++;
			if(idx < files.length){
				downloadFile(files, idx, tbdy);
			}
		}
	};
	cypt.start();
}
function viewFile(fid, fnm){
	var tbdy = getTableBody("#tblFileDetail")["tbody"];
	showGround(2);

	var sfx = getSfx(fnm);
	var span = tbdy.rows[0].cells[1].getElementsByTagName("span")[0];
	var img = tbdy.rows[0].cells[1].getElementsByTagName("img")[0];
	var imgType = g_imagetypes[sfx];
	var vdoType = g_videotypes[sfx];
	span.style.display = null;
	img.style.display = "none";
	img.src = "";
	var vdo = endVideoStream(tbdy);
	tbdy.rows[1].style.display = null;
	tbdy.rows[2].style.display = null;
	if(vdoType){
		playVedio(vdo, fid);
		vdo.style.display = null;
		span.style.display = "none";
		tbdy.rows[1].style.display = "none";
		tbdy.rows[2].style.display = "none";
		return;
	}else if(!imgType){
		return;
	}

	var reader = g_drive.createReader({
		"auth": g_accessToken,
		"id": fid,
		"bufSize": 160000,
	});
	var writer = new ZBlobWriter();
	var cypt = new ZbCrypto({
		"decrypt": true,
		"keycfg": g_keycfg,
		"reader": reader,
		"writer": writer,
	});
	cypt.onfinal = function(a_err, a_canceled){
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
			img.style.display = null;
			span.style.display = "none";
			tbdy.rows[1].style.display = "none";
			tbdy.rows[2].style.display = "none";
		}
	};
	cypt.start();
}
function imageLoaded(){
	var img = getElement();
	if(img && img.src){
		window.URL.revokeObjectURL(img.src);
	}
}
function playVedio(vdo, fid){
	var reader = new OneDriveReader({
		"auth": g_accessToken,
		"id": fid,
	});
	const VideoStream = zb_require("videostream");
	vdo.wrapper = new ZbStreamWrapper({
		"decrypt": true,
		"keycfg": g_keycfg,
		"reader": reader,
	});
//	vdo.addEventListener("error", function(err){
//		console.error(err);
//		console.error(err.target.strm.detailedError);
//	});
	vdo.vstrm = new VideoStream(vdo.wrapper, vdo);
}
function hideGround(){
	document.getElementById("divGround").style.display = null;
	endVideoStream();
	document.getElementById("divItemenu").style.display = null;
	document.getElementById("divNewName").style.display = null;
}
function endVideoStream(tbdy){
	if(!tbdy){
		tbdy = getTableBody("#tblFileDetail")["tbody"];
	}
	var vdo = tbdy.rows[0].cells[1].getElementsByTagName("video")[0];
	vdo.style.display = "none";
	if(vdo.vstrm){
		vdo.vstrm.destroy();
		vdo.wrapper.destroyStream();
		delete vdo.vstrm;
		delete vdo.wrapper;
	}
	return vdo;
}

/** @type {?ZbLocalStorage} */
var g_storage = null;
/** @type {?ZBDrive} */
var g_drive = null;
/** @type {Object<string, (string|boolean)>} */
var g_conf = null;
/** @type {?CipherParams} */
var g_keycfg = null;
/** @type {Array<DriveItem>} */
var g_paths = new Array();
/** @type {number} */
var g_hdlNotify = 0;

/**
 * @param {*} msg
 */
function showError(msg){
	/** @type {Element} */
	var ele = document.getElementById("spanError");
	if(typeof msg === "string"){
		if(window["msgs"] && msg && window["msgs"][msg]){
			ele.innerText = window["msgs"][msg];
		}else{
			ele.innerText = msg;
		}
	}else if(msg){
		ele.innerText = JSON.stringify(msg);
	}
	document.getElementById("spanInfo").style.display = "none";
	if(msg){
		ele.style.display = "block";
	}else{
		ele.style.display = "none";
	}
}
/**
 * @param {string=} msg
 */
function showInfo(msg){
	/** @type {Element} */
	var ele = document.getElementById("spanInfo");
	if(window["msgs"] && msg && window["msgs"][msg]){
		ele.innerText = window["msgs"][msg];
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
/**
 * @param {string} msg
 */
function showNotify(msg){
	/** @type {Element} */
	var ele = document.getElementById("spanNotify");
	if(window["msgs"] && msg && window["msgs"][msg]){
		ele.innerText = window["msgs"][msg];
	}else{
		ele.innerText = msg;
	}
	if(msg){
		if(g_hdlNotify){
			clearTimeout(g_hdlNotify);
			g_hdlNotify = 0;
		}
		ele.style.display = "";
		g_hdlNotify = setTimeout(function(){
			ele.style.display = "none";
			g_hdlNotify = 0;
		}, 3000);
	}
}
/**
 * @param {string} fnm
 * @return {string}
 */
function encryptFname(fnm){
	if(g_conf["encfname"]){
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
	if(g_conf["encfname"]){
		try{
			return zbDecryptString(fnm, g_keycfg);
		}catch(ex){
			console.error(ex);
		}
	}
	return fnm;
}
/**
 * @param {Event} evt
 * @param {function(boolean)} func
 */
function loadjsend(evt, func){
	loadjs.count--;
	if(evt.type == "error"){
		loadjs.err = true;
	}
	if(loadjs.count == 0){
		/** @type {boolean} */
		var err = loadjs.err;
		delete loadjs.err;
		if(func){
			func(err);
		}
	}
	/** @type {EventTarget} */
	var script = evt.target || evt.srcElement;
	if(script.hasAttribute("temporary")){
		script.remove();
	}
}
/**
 * @param {string} js
 * @param {function(boolean)} func
 * @param {boolean} remove
 */
function loadjs(js, func, remove){
	loadjs.count++;
	/** @type {function(Event)} */
	var endfunc = function(a_evt){
		loadjsend(a_evt, func);
	};
	/** @type {Element} */
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
/** @type {number} */
loadjs.count = 0;

/**
 * Event called from html
 */
function onbody(){
	g_storage = new ZbLocalStorage();
	g_storage.initIdxDb(function(a_err){
		if(a_err){
			showError("IndexedDB is not supported in your browser settings.");
		}
		onbody3();
	});
}
/**
 * @param {WordArray} keyWords
 */
function saveKeyData(keyWords){
	if(!g_storage.isReady()){
		return;
	}
	if(document.getElementById("chkSaveKey").checked){
		fetchLocalStorageAuth(function(a_lskdat){
			/** @type {string} */
			var a_kw = "";
			if(a_lskdat && a_lskdat["lsauth"]){
				/** @type {WordArray} */
				var a_dat = zbDataCrypto(true, keyWords, /** @type {string} */(a_lskdat["lsauth"]));
				a_kw = a_dat.toString(CryptoJS.enc.Base64url);
			}
			g_storage.saveDriveData("key_words", a_kw, true);
		});
	}else{
		g_storage.saveDriveData("key_words", null, true);
	}
}
/**
 * Event called from html
 */
function logout(){
	g_storage.clearLogInfo(function(){
		g_drive.logout();
	});
}
/**
 * Get authorization of local storage
 *
 * @param {function(Object<string, (string|boolean)>)} func
 */
function fetchLocalStorageAuth(func){
	/** @type {FormData} */
	var formData = new FormData();
	formData.append("drive_type", "localstorage");
	/** @type {XMLHttpRequest} */
	var ajax = new XMLHttpRequest();
	ajax.open("POST", g_AUTHURL, true);
	ajax.withCredentials = true;
	ajax.onload = function(a_evt){
		/** @type {XMLHttpRequest} */
		var a_x = a_evt.target;
		if(a_x.readyState == 4){
			/** @type {?Object<string, (string|boolean)>} */
			var a_ret = null;
			if(a_x.status == 200){
				var a_resp = JSON.parse(a_x.responseText);
				if(a_resp){
					if(a_resp["error"]){
						showError("["+a_resp["error"]+"] "+a_resp["error_description"]);
					}else if(a_resp["lsauth"]){
						a_ret = /** @type {Object<string, (string|boolean)>} */(a_resp);
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
	/** @type {?string} */
	var lang = g_storage.getLanguage();
	if(!lang){
		g_storage.restoreFromSession();
		lang = g_storage.getLanguage(true);
	}
	if(!lang){
		lang = navigator.language;
		/** @type {number} */
		var i = lang.indexOf("-");
		if(i > 0){
			lang = lang.substring(0, i);
		}
	}
	changeLanguage(lang);

	/**
	 * Settings of drive
	 *
	 * @type {?string}
	 */
	var drv = g_storage.getDrive(true);
	/** @type {Element} */
	var sel = document.getElementById("selDrive");
	/** @type {Object<string, string>} */
	var uparams  = getQueryParameters();
	for(var ii in g_DRIVES){
		/** @type {Element} */
		var opt = document.createElement("option");
		opt.value = ii;
		opt.innerText = g_DRIVES[ii]._name;
		if(drv){
			if(drv == ii){
				opt.selected = true;
			}
		}else{
			if(g_DRIVES[ii]._isTarget(uparams)){
				drv = ii;
				opt.selected = true;
			}
		}
		sel.appendChild(opt);
	}

	if(g_storage.isReady()){
		document.getElementById("divSkipLogin").style.display = "block";
		document.getElementById("divSaveKey").style.display = "block";
		if(g_storage.isSkipLogin()){
			document.getElementById("chkSkipLogin").checked = true;
		}
		if(g_storage.getDriveData("key_words")){
			document.getElementById("chkSaveKey").checked = true;
		}
	}

	// Load drive
	if(drv){
		loadDrive(drv);
	}else{
		showSettings();
	}
}
/**
 * Event called from html
 * @param {Event=} evt
 */
function showSettings(evt){
	/** @type {Element} */
	var sel = document.getElementById("selDrive");
	/** @type {Element} */
	var btn = nextElement(sel, "input");
	if(evt){
		sel.disabled = true;
		btn.style.display = "";
	}else{
		sel.disabled = false;
		btn.style.display = "none";
	}
	document.getElementById("divSet").style.display = "block";
}
/**
 * @param {string} lang
 */
function changeLanguage(lang){
	if(window["msgs"] && window["msgs"]["lang"] == lang){
		return;
	}

	/**
	 * Define messages
	 *
	 * @type {Object<string, string>}
	 */
	var old_msgs = window["msgs"];
	window["msgs"] = null;
	loadjs("msg/"+lang+".js", function(a_err){
		if(window["msgs"]){
			window["msgs"]["lang"] = lang;
			g_storage.setLanguage(lang);
			applyLanguage(window["msgs"]);
		}else{
			console.log("Message file of '"+lang+"' is missing.");
			if(old_msgs){
				window["msgs"] = old_msgs;
			}else{
				loadjs("msg/en.js", function(b_err){
					if(window["msgs"]){
						window["msgs"]["lang"] = "en";
						g_storage.setLanguage(window["msgs"]["lang"]);
						applyLanguage(window["msgs"]);
					}else{
						showError("Message file is missing.");
					}
				}, true);
			}
		}
	}, true);
}
/**
 * @param {Object<string, string>} msgs
 */
function applyLanguage(msgs){
	// Patch message
	msgs["spanConfNotice"] = msgs["spanConfNotice"].replace("{0}", g_CONFILE);
	/**
	 * Set text for all elements
	 *
	 * @type {!NodeList<!Element>}
	 */
	var eles = document.getElementsByTagName("*");
	for(var ii=0; ii<eles.length; ii++){
		/** @type {Element} */
		var ele = eles[ii];
		/** @type {?string} */
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

	/**
	 * Settings of language
	 *
	 * @type {Element}
	 */
	var sel = document.getElementById("seLang");
	for(var ii in g_LANGUAGES){
		/** @type {Element} */
		var opt = document.createElement("option");
		opt.value = ii;
		opt.innerText = g_LANGUAGES[ii];
		if(ii == msgs["lang"]){
			opt.selected = true;
		}
		sel.appendChild(opt);
	}
}
/**
 * @param {string} drvnm
 */
function loadDrive(drvnm){
	showInfo("loading");
	/** @type {DriveDefine} */
	var drv = g_DRIVES[drvnm];
	if(drv){
		g_drive = drv._newInstance(g_storage, g_AUTHURL, g_RELAYURL);
	}else{
		showError("unkDrive");
		return;
	}
	if(g_drive.login(true)){
		g_storage.saveAllData();
	}else{
		return;
	}

	// Get configuration file.
	g_drive.getItem({
		/** @type {function((boolean|DriveJsonRet), DriveItem=)} */
		_doneFunc: function(a_err, a_dat){
			if(a_err){
				if(a_err._status == 404){
					showInputPassword(true);
				}else{
					showError(JSON.stringify(a_err));
				}
			}else{
				downloadConfile(a_dat._id);
			}
		},
		_upath: g_CONFILE,
	});
}
/**
 * Event called from html
 */
function saveSettings(){
	/** @type {boolean} */
	var needLoad = g_storage.setDrive(document.getElementById("selDrive").value);
	g_storage.setSkipLogin(document.getElementById("chkSkipLogin").checked);
	changeLanguage(document.getElementById("seLang").value);
	if(needLoad){
		g_storage.clearSession();
		loadDrive(document.getElementById("selDrive").value);
	}else{
		g_storage.saveAllData();
	}
	document.getElementById("divSet").style.display = "none";
}
/**
 * Event called from html
 */
function cancelSettings(){
	document.getElementById("divSet").style.display = "none";
}
/**
 * @param {boolean=} firstep
 */
function showInputPassword(firstep){
	/** @type {Element} */
	var div = document.getElementById("divPwd");
	/** @type {string} */
	var disp = "none";
	if(firstep){
		div.setAttribute("firstep", "1");
		disp = "block";
	}else{
		div.removeAttribute("firstep");
	}

	/** @type {!NodeList<!Element>} */
	var eles = div.getElementsByTagName("*");
	for(var ii=0; ii<eles.length; ii++){
		/** @type {Element} */
		var ele = eles[ii];
		if(ele.classList.contains("firstep")){
			ele.style.display = disp;
		}
	}
	div.style.display = "block";
	showInfo();
}
/**
 * Event called from html
 */
function cancelSetPwd(){
	document.getElementById("divPwd").display = "";
}
/**
 * Event called from html
 */
function moreKeyf(){
	/** @type {EventTarget} */
	var ele = getElement();
	/** @type {Element} */
	var inp = ele.previousElementSibling.cloneNode();
	inp.value = "";
	ele.parentElement.insertBefore(inp, ele);
}
/**
 * Event called from html
 */
function clearKeyf(){
	/** @type {!NodeList<!Element>} */
	var eles = getElement().parentElement.getElementsByTagName("input");
	for(var i=eles.length-1; i>0; i--){
		eles[i].remove();
	}
	eles[0].value = "";
}
/**
 * Event called from html
 */
function setPassword(){
	showInfo("loading");

	/** @type {boolean} */
	var firstep = document.getElementById("divPwd").hasAttribute("firstep");
	/** @type {string} */
	var pwdKey = document.getElementById("pwdKey").value;
	/** @type {!NodeList<!Element>} */
	var eles = document.getElementById("divfKey").getElementsByTagName("input");
	/** @type {Array<File>} */
	var fKey = new Array();
	for(var i=0; i<eles.length; i++){
		/** @type {Array<File>} */
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
		/** @type {string} */
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

	/** @type {WordArray} */
	var words = null;
	if(pwdKey){
		words = CryptoJS.enc.Utf8.parse(pwdKey);
	}
	if(fKey.length > 0){
		/** @type {number} */
		var i = 0;
		/** @type {FileReader} */
		var reader = new FileReader();
		/** @type {Hasher} */
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
/**
 * @param {WordArray} keyWords
 * @param {boolean=} firstep
 */
function checkPassword(keyWords, firstep){
	/** @type {string} */
	var hmac = CryptoJS.HmacMD5(keyWords, g_HASHKEY).toString(CryptoJS.enc.Base64url).slice(0, 8);
	/** @type {WordArray} */
	var rkeys = null;
	if(firstep){
		saveKeyData(keyWords);
		g_conf = {
			"root": document.getElementById("txtRoot").value,
		};
		if(document.getElementById("chkEncryFname").checked){
			g_conf["encfname"] = true;
		}
		rkeys = CryptoJS.lib.WordArray.random(1024);
		g_keycfg = zbCreateCfg(rkeys);
		g_conf["iv"] = hmac.concat(cryptoRKeys(true, rkeys, keyWords));
		uploadConfile(g_conf);
	}else if(g_conf && g_conf["iv"] && hmac == g_conf["iv"].slice(0, hmac.length)){
		saveKeyData(keyWords);
		rkeys = /** @type {WordArray} */(cryptoRKeys(false, g_conf["iv"].slice(hmac.length), keyWords));
		g_keycfg = zbCreateCfg(rkeys);
		checkRootFolder();
	}else if(isVisible(document.getElementById("divPwd"))){
		showError("pwdError");
	}else{
		showInputPassword();
	}
}
/**
 * @param {boolean} encFlg
 * @param {WordArray|string} rkeys
 * @param {WordArray} keyWords
 * @return {string|WordArray}
 */
function cryptoRKeys(encFlg, rkeys, keyWords){
	/** @type {CipherParams} */
	var cfg = zbCreateCfg(keyWords);
	/** @type {WordArray} */
	var dat1 = null;
	if(encFlg){
		dat1 = /** @type {WordArray} */(rkeys);
	}else{
		dat1 = CryptoJS.enc.Base64url.parse(rkeys);
	}
	/** @type {WordArray|string} */
	var dat = zbDataCrypto(encFlg, dat1, cfg);
	if(encFlg){
		return dat.toString(CryptoJS.enc.Base64url);
	}else{
		showInputPassword();
		return dat;
	}
}
/**
 * @param {Object<string, (string|boolean)>} conf
 */
function uploadConfile(conf){
	/** @type {WordArray} */
	var words = CryptoJS.enc.Utf8.parse(JSON.stringify(conf));
	/** @type {Blob} */
	var blob = new Blob([new Uint8Array(wordArrayToBytes(words))], { "type" : "application/octet-binary" });
	/** @type {ZBlobReader} */
	var reader = new ZBlobReader({
		_blob: blob,
	});
	/** @type {ZBWriter} */
	var writer = g_drive.createWriter({
		_fnm: g_CONFILE,
	});
	zbPipe(reader, writer, null, checkRootFolder);
}
/**
 * @param {string} fid
 */
function downloadConfile(fid){
	/** @type {ZBReader} */
	var reader = g_drive.createReader({
		_id: fid,
	});
	/** @type {ZBWriter} */
	var writer = new ZBlobWriter();
	zbPipe(reader, writer, null, function(){
		/** @type {WordArray} */
		var a_words = new CryptoJS.lib.WordArray.init(writer.getBuffer());
		g_conf = /** @type {Object<string,(boolean|string)>} */(JSON.parse(a_words.toString(CryptoJS.enc.Utf8)));
		/** @type {?string} */
		var a_kw = g_storage.getDriveData("key_words");
		if(a_kw){
			fetchLocalStorageAuth(function(b_lskdat){
				if(b_lskdat && b_lskdat["lsauth"] && !b_lskdat["newkey"]){
					/** @type {WordArray} */
					var b_keywords = zbDataCrypto(false, CryptoJS.enc.Base64url.parse(a_kw), /** @type {string} */(b_lskdat["lsauth"]));
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
		_method: "GET",
		_doneFunc: function(a_status, a_restext){
			g_conf = JSON.parse(a_restext);
			var a_kw = g_storage.getDriveData("key_words");
			if(a_kw){
				fetchLocalStorageAuth(function(b_lskdat){
					if(b_lskdat && b_lskdat["lsauth"] && !b_lskdat["newkey"]){
						var b_keywords = zbDataCrypto(false, CryptoJS.enc.Base64url.parse(a_kw), b_lskdat["lsauth"]);
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
	getDriveInfo(function(){
		/** @type {string} */
		var fldr = /** @type {string} */(g_conf["root"]);
		// Get root folder.
		g_drive.getItem({
			_doneFunc: function(a_err, a_dat){
				if(a_err){
					if(a_err._status == 404){
						// Create root folder
						g_drive.newFolder({
							_folder: fldr,
							_doneFunc: function(b_err, b_dat){
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
			_upath: fldr,
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
	ele.innerText = window["msgs"]["quotaInfo"].replace("{0}", getSizeDisp(free));
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
/**
 * @param {boolean=} reload
 * @param {boolean=} onlyfolder
 * @param {DriveItem=} fld
 */
function listFolder(reload, onlyfolder, fld){
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
			oldlnk.classList.add("fnormal");
		}
		/** @type {Element} */
		var lnk = document.createElement("a");
		/** @type {Element} */
		var span = document.createElement("span");
		lnk.href = "#";
		lnk.innerText = fld._name;
		lnk.setAttribute("uid", fld._id);
		lnk.setAttribute("idx", idx);
		lnk.addEventListener("click", clickPath);
		th.appendChild(lnk);
		span.innerText = ">";
		th.appendChild(span);
	}

	g_drive.listFolder({
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
			showInfo();
		},
		_uid: fld._id,
	});
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
	}
	if(!fonly){
		b_chk.type = "checkbox";
		b_td.appendChild(b_chk);
		if(isFolder(itm)){
			b_span.innerHTML = "&#x1f4c1;";
		}else{
			/** @type {string} */
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
	b_link.setAttribute("uid", itm._id);
	b_link.setAttribute("utype", /** @type {string} */(itm._type));
	b_link.addEventListener("click", /** @type {function(Event)} */(clickItem));
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
 * Event called from html
 * @param {number|Event=} direction
 * @param {boolean=} noLoop
 *
 * direction: 1 previous, 2 next, self if omitted.
 */
function clickItem(direction, noLoop){
	window.event.preventDefault();
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
		div1.style.top = (rect.top - 2) + "px";
		txt.style.width = rect.width + "px";
		txt.style.height = rect.height + "px";
		div1.style.display = "block";
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
function keypressNewname(){
	/** @type {Event} */
	var evt = window.event;
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
	tbdy.innerHTML = "";
	tbl.getElementsByTagName("th")[0].innerText = window["msgs"]["updQueue"];
	tbl.style.display = "block";

	/** @type {Array<UploadTarget>} */
	var targets = new Array();
	for(var i = 0; i < files.length; i++){
		/** @type {Element} */
		var tr = document.createElement("tr");
		/** @type {Element} */
		var td = document.createElement("td");
		/** @type {Element} */
		var span = document.createElement("span");
		/** @type {Element} */
		var btn = document.createElement("input");
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
		});
		td.innerText = fpath;
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
		tbdy.appendChild(tr);
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
			a_span.innerText = a_cypt.calSpeed() + " " + Math.round(a_reader.getPos() * 100 / a_reader.getSize()) + "%";
			if(a_btn.getAttribute("canceled")){
				return false;
			}else{
				return true;
			}
		};

		a_cypt.onfinal = /** @type {function(*=, boolean=)} */(function(b_err, b_canceled){
			a_btn.style.display = "none";
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

	if(foderFlg){
		// Get current folder's path
		g_drive.getItem({
			/** @type {string} */
			_uid: g_paths[g_paths.length - 1]._id,
			/** @type {function((boolean|DriveJsonRet), DriveItem=)} */
			_doneFunc: function(a_err, a_dat){
				basePath = a_dat._parent.concat("/").concat(a_dat._name);
				baseId = a_dat._id;
				uploadFile(0);
			},
		});
	}else{
		baseId = g_paths[g_paths.length - 1]._id;
		uploadFile(0);
	}
}
/**
 * Event called from html
 */
function cancel(){
	/** @type {EventTarget} */
	var ele = getElement();
	ele.setAttribute("canceled", "1");
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
	tbdy.innerHTML = "";
	tbl.getElementsByTagName("th")[0].innerText = window["msgs"]["downQueue"];
	tbl.style.display = "block";

	for(var i = 0; i < files.length; i++){
		/** @type {Element} */
		var tr = document.createElement("tr");
		/** @type {Element} */
		var td = document.createElement("td");
		/** @type {Element} */
		var span = document.createElement("span");
		/** @type {Element} */
		var btn = document.createElement("input");
		td.innerText = files[i]._name;
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
		tbdy.appendChild(tr);
	}

	downloadFile(files, 0, tbdy);
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
		span.innerText = cypt.calSpeed();
		if(btn.getAttribute("canceled")){
			return false;
		}else{
			return true;
		}
	};
	cypt.onfinal = /** @type {function(*=, boolean=)} */(function(a_err, a_canceled){
		btn.style.display = "none";
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
	span.style.display = "";
	img.style.display = "none";
	img.src = "";
	/** @type {Element} */
	var vdo = endVideoStream(tbdy);
	tbdy.rows[1].style.display = "";
	tbdy.rows[2].style.display = "";
	if(vdoType){
		playVedio(vdo, fid);
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
 */
function playVedio(vdo, fid){
	/** @type {ZBReader} */
	var reader = g_drive.createReader({
		_id: fid,
	});
	const VdoStrm = /** @type {typeof VideoStream} */(zb_require("videostream"));
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
	vdo.style.display = "none";
	if(vdo.vstrm){
		vdo.vstrm.destroy();
		vdo.wrapper.destroyStream();
		delete vdo.vstrm;
		delete vdo.wrapper;
	}
	return vdo;
}

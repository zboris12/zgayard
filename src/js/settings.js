/** @type {?ZbLocalStorage} */
var g_storage = null;
/** @type {?ZBDrive} */
var g_drive = null;
/** @type {Array<Object<string, (string|boolean)>>} */
var g_conf = new Array();
/** @type {number} */
var g_rootidx = 0;
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

function loadSettings(){
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
	var div = document.getElementById("divSet");
	/** @type {Element} */
	var sel = document.getElementById("selDrive");
	/** @type {Element} */
	var btn = nextElement(sel, "input");
	if(evt){
		sel.disabled = true;
		btn.style.display = "";
		div.setAttribute("cancelAll", "1");
		showInputPassword();
		document.getElementById("divHeader").style.display = "";
		document.getElementById("tblst").style.display = "";
		document.getElementById("tblQueue").style.display = "";
		document.getElementById("divAction").style.display = "";
	}else{
		sel.disabled = false;
		btn.style.display = "none";
	}
	div.style.display = "block";
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
					showInputPassword(true, true);
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
	/** @type {Element} */
	var sel = document.getElementById("selDrive");
	/** @type {boolean} */
	var needLoad = false;
	if(!sel.disabled){
		needLoad = g_storage.setDrive(document.getElementById("selDrive").value);
	}
	g_storage.setSkipLogin(document.getElementById("chkSkipLogin").checked);
	changeLanguage(document.getElementById("seLang").value);
	if(needLoad){
		g_storage.clearSession();
		loadDrive(document.getElementById("selDrive").value);
	}else{
		g_storage.saveAllData();
	}
	hideSettings();
}
/**
 * Event called from html
 *
 * @param {Event|boolean=} all
 */
function hideSettings(all){
	/** @type {Element} */
	var div = document.getElementById("divSet");
	/** @type {boolean} */
	var ccall = false;
	if(all && typeof all === "boolean"){
		ccall = true;
	}else if(div.getAttribute("cancelAll") == "1"){
		ccall = true;
	}
	if(ccall){
		document.getElementById("divPwd").style.display = "";
		document.getElementById("divHeader").style.display = "block";
		document.getElementById("tblst").style.display = "block";
		document.getElementById("tblQueue").style.display = "block";
		document.getElementById("divAction").style.display = "block";
		div.removeAttribute("cancelAll");
	}
	div.style.display = "";
}
/**
 * @param {Event|boolean=} addroot
 * @param {boolean=} firstep
 */
function showAddRoot(addroot, firstep){
	/** @type {Element} */
	var div = document.getElementById("divPwd");
	/** @type {string} */
	var disp = "none";
	if(addroot){
		div.setAttribute("addroot", "1");
		disp = "block";
	}else{
		div.removeAttribute("addroot");
	}
	/** @type {!NodeList<!Element>} */
	var eles = div.getElementsByTagName("*");
	for(var ii=0; ii<eles.length; ii++){
		/** @type {Element} */
		var ele = eles[ii];
		if(ele.classList.contains("addroot")){
			ele.style.display = disp;
		}else if(ele.classList.contains("firstep")){
			if(disp != "none" && firstep){
				ele.style.display = "block";
			}else{
				ele.style.display = "none";
			}
		}else if(ele.classList.contains("chgroot")){
			if(disp == "none"){
				ele.style.display = "block";
			}else{
				ele.style.display = "none";
			}
		}
		if(ele.type == "password"){
			ele.value = "";
		}
	}
	clearKeyf("#lblKeyFile");
}
/**
 * @param {boolean=} addroot
 * @param {boolean=} firstep
 */
function showInputPassword(addroot, firstep){
	/** @type {Element} */
	var div = document.getElementById("divPwd");
	showAddRoot(addroot, firstep);
	div.style.display = "block";
	showInfo();
}
/**
 * Event called from html
 */
function hideSetPwd(){
	if(document.getElementById("divSet").getAttribute("cancelAll") == "1"){
		hideSettings(true);
	}else{
		document.getElementById("divPwd").style.display = "";
	}
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
 *
 * @param {Event|string} evt
 */
function clearKeyf(evt){
	/** @type {!NodeList<!Element>} */
	var eles = getElement(evt).parentElement.getElementsByTagName("input");
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
	var addroot = document.getElementById("divPwd").hasAttribute("addroot");
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
	if(addroot){
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
				checkPassword(words, addroot);
			}
		};
		reader.doread();
	}else{
		checkPassword(words, addroot);
	}
}
/**
 * @param {WordArray} keyWords
 * @param {boolean=} addroot
 */
function checkPassword(keyWords, addroot){
	/** @type {string} */
	var hmac = CryptoJS.HmacMD5(keyWords, g_HASHKEY).toString(CryptoJS.enc.Base64url).slice(0, 8);
	/** @type {WordArray} */
	var rkeys = null;
	if(addroot){
		/** @type {Object<string, (string|boolean)>} */
		var conf = {
			"root": document.getElementById("txtRoot").value,
		};
		if(document.getElementById("chkEncryFname").checked){
			conf["encfname"] = true;
		}
		/** @type {boolean} */
		var err = false;
		g_conf.forEach(/** function(Object<string, (string|boolean)>) */function(a_ele){
			if(a_ele["root"] == conf["root"]){
				err = true;
			}
		});
		if(err){
			showError("dupRoot");
			return;
		}else{
			g_storage.saveDriveData("root", /** @type {string} */(conf["root"]));
			saveKeyData(keyWords);
		}
		rkeys = CryptoJS.lib.WordArray.random(1024);
		g_keycfg = zbCreateCfg(rkeys);
		conf["iv"] = hmac.concat(cryptoRKeys(true, rkeys, keyWords));
		g_rootidx = g_conf.length;
		g_conf.push(conf);
		appendRootItem(conf, true);
		uploadConfile(g_conf);
	}else{
		/** @type {string} */
		var a_root = document.getElementById("selRoot").value;
		/** @type {number} */
		var a_rootidx = -1;
		g_conf.forEach(/** function(Object<string,(boolean|string)>, number) */(function(b_ele, b_idx){
			if(b_ele["root"] == a_root){
				a_rootidx = b_idx;
			}
		}));
		if(a_rootidx >= 0 && g_conf[a_rootidx]["iv"] && hmac == g_conf[a_rootidx]["iv"].slice(0, hmac.length)){
			g_rootidx = a_rootidx;
			g_storage.saveDriveData("root", a_root);
			saveKeyData(keyWords);
			rkeys = /** @type {WordArray} */(cryptoRKeys(false, g_conf[g_rootidx]["iv"].slice(hmac.length), keyWords));
			g_keycfg = zbCreateCfg(rkeys);
			checkRootFolder();
		}else if(isVisible(document.getElementById("divPwd"))){
			showError("pwdError");
		}else{
			showInputPassword();
		}
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
		return dat;
	}
}
/**
 * @param {Array<Object<string, (string|boolean)>>} conf
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
		var a_conf = JSON.parse(a_words.toString(CryptoJS.enc.Utf8));
		if(Array.isArray(a_conf)){
			g_conf = /** @type {Array<Object<string,(boolean|string)>>} */(a_conf);
		}else{
			g_conf.push(/** @type {Object<string,(boolean|string)>} */(a_conf));
		}
		/** @type {number} */
		var a_rootidx = -1;
		/** @type {?string} */
		var a_root = g_storage.getDriveData("root");
		/** @type {Element} */
		var a_sel = document.getElementById("selRoot");
		a_sel.innerHTML = "";
		g_conf.forEach(/** function(Object<string,(boolean|string)>, number) */(function(b_ele, b_idx){
			/** @type {boolean} */
			var b_selected = false;
			if(a_root && b_ele["root"] == a_root){
				b_selected = true;
			}
			appendRootItem(b_ele, b_selected, a_sel);
			if(b_selected){
				a_rootidx = b_idx;
			}
		}));
		if(a_rootidx >= 0){
			g_rootidx = a_rootidx;
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
		}else{
			g_rootidx = 0;
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
/**
 * @param {Object<string, (string|boolean)>} _conf
 * @param {boolean=} _selected
 * @param {Element=} _sel
 */
function appendRootItem(_conf, _selected, _sel){
	/** @type {Element|undefined} */
	var sel = _sel;
	if(!_sel){
		sel = document.getElementById("selRoot");
	}
	/** @type {Element} */
	var opt = document.createElement("option");
	opt.value = _conf["root"];
	opt.innerText = _conf["root"];
	if(_selected){
		opt.selected = true;
	}
	sel.appendChild(opt);
}

/** @type {?ZbLocalStorage} */
var g_storage = null;
/** @type {?ZbDrive} */
var g_drive = null;
/** @type {Array<Object<string, (string|boolean)>>} */
var g_conf = new Array();
/** @type {number} */
var g_rootidx = 0;
/** @type {AesSecrets} @suppress {checkTypes} */
var g_keycfg = null;
/** @type {Array<DriveItem>} */
var g_paths = new Array();
/** @type {number} */
var g_hdlMessage = 0;
/** @type {Array<PlayedInfo>} */
var g_recents = new Array();

/**
 * @enum {number}
 */
const MessageType = {
	NONE: 0,
	INFO: 1,
	ERROR: 2,
};

/**
 * @param {MessageType} typ type
 * @param {string=} msg message
 * @param {string=} tl title
 */
function showMessage(typ, msg, tl){
	if(g_hdlMessage){
		window.clearTimeout(g_hdlMessage);
		g_hdlMessage = 0;
	}

	/** @type {Element} */
	var ele = getElement("#divMessage");
	if(typ == MessageType.NONE){
		if(!ele.style.display){
			ele.style.opacity = "0";
			g_hdlMessage = window.setTimeout(function(){
				g_hdlMessage = 0;
				hideElement(ele);
			}, 150);
		}
	}else{
		/** @type {Array<Element>} */
		var eles = getElementsByAttribute("span", ele);
		if(typ == MessageType.INFO){
			ele.className = "zb-notice";
			eles[0].innerText = "Notice";
		}else{
			ele.className = "zb-alert";
			eles[0].innerText = "Error";
		}
		if(msg){
			eles[1].innerText = msg;
		}else{
			eles[1].innerText = "";
		}
		if(tl){
			eles[0].innerText = tl;
		}
		if(ele.style.opacity){
			showElement(ele);
			g_hdlMessage = window.setTimeout(function(){
				g_hdlMessage = 0;
				ele.style.opacity = "";
			}, 50);
		}
	}
}
function hideMessage(){
	showMessage(MessageType.NONE);
}
/**
 * @param {*} msg
 */
function showError(msg){
	/** @type {string} */
	var _msg = "";
	if(typeof msg === "string"){
		if(window["msgs"] && msg && window["msgs"][msg]){
			_msg = window["msgs"][msg];
		}else{
			_msg = msg;
		}
	}else if(msg){
		_msg = JSON.stringify(msg);
	}
	showMessage(MessageType.ERROR, _msg);
}
/**
 * @param {string=} msg
 */
function showInfo(msg){
	/** @type {string|undefined} */
	var _msg = msg;
	if(window["msgs"] && msg && window["msgs"][msg]){
		_msg = window["msgs"][msg];
	}
	showMessage(MessageType.INFO, _msg);
}
/**
 * @param {string} msg
 */
function showNotify(msg){
	showInfo(msg);
	g_hdlMessage = setTimeout(function(){
		g_hdlMessage = 0;
		hideMessage();
	}, 3000);
}

/**
 * @param {string} js
 * @param {boolean=} remove
 * @return {!Promise<boolean>}
 */
function loadjs(js, remove){
	return new Promise(function(resolve, reject){
		/** @type {function(Event)} */
		var endfunc = function(a_evt){
			/** @type {EventTarget} */
			var a_spt = a_evt.target || a_evt.srcElement;
			if(remove){
				a_spt.remove();
			}
			resolve(a_evt.type != "error");
		};
		/** @type {Element} */
		var script = document.createElement("script");
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", js);
		script.addEventListener("load", endfunc);
		script.addEventListener("error", endfunc);
		document.body.appendChild(script);
	});
}

/**
 * @param {string} keyWords
 * @return {!Promise<void>}
 */
async function saveKeyData(keyWords){
	if(!g_storage.isReady()){
		return;
	}
	if(getElement("#chkSaveKey").checked){
		/** @type {Object<string, (string|boolean)>|undefined} */
		var a_lskdat = await fetchLocalStorageAuth().catch(function(a_err){
			showError(a_err);
		});
		if(a_lskdat){
			/** @type {string} */
			var a_kw = "";
			if(a_lskdat && a_lskdat["lsauth"]){
				/** @type {string} */
				var a_dat = zbDataCrypto(true, keyWords, /** @type {string} */(a_lskdat["lsauth"]));
				a_kw =  rawToBase64url(a_dat);
			}
			await g_storage.saveDriveData("key_words", a_kw, true);
		}
	}else{
		await g_storage.saveDriveData("key_words", null, true);
	}
}

/**
 * Event called from html
 * @return {!Promise<void>}
 */
async function logout(){
	await g_storage.clearLogInfo();
	await g_drive.logout();
}
/**
 * Get authorization of local storage
 *
 * @return {!Promise<null|Object<string, (string|boolean)>>}
 */
async function fetchLocalStorageAuth(){
	/** @type {null|Object<string, (string|boolean)>} */
	var ret = null;
	/** @type {FormData} */
	var formData = new FormData();
	formData.append("drive_type", "localstorage");
	/** @type {Response} */
	var resp = await fetch(g_AUTHURL, {
		"method": "POST",
		"body": formData,
		"credentials": "include",
		"redirect": "follow",
	});
	if(resp.status == 200){
		var respObj = await resp.json();
		if(respObj){
			if(respObj["error"]){
				throw "["+respObj["error"]+"] "+respObj["error_description"];
			}else if(respObj["lsauth"]){
				ret = /** @type {Object<string, (string|boolean)>} */(respObj);
			}else{
				throw "lsFailed";
			}
		}else{
			throw "lsFailed";
		}
	}else{
		/** @type {string} */
		var resptext = await resp.text();
		throw resptext+" ("+resp.status+")";
	}
	return ret;
}

/**
 * Called from main.js
 *
 * @return {!Promise<void>}
 */
async function loadSettings(){
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
	await changeLanguage(lang);

	getElement("#txtRelay").value = g_storage.getRelayUrl();

	/**
	 * Settings of drive
	 *
	 * @type {?string}
	 */
	var drv = g_storage.getDrive(true);
	/** @type {?DriveExtraInfo} */
	var dext = g_storage.getDriveExInfo();
	if(dext){
		getElement("#chkOwnSecret").click();
		getElement("#txtClientId").value = dext._clientId;
		getElement("#txtClientSecret").value = dext._clientSecret;
	}
	/** @type {Element} */
	var sel = getElement("#selDrive");
	/** @type {Object<string, string>} */
	var uparams  = getQueryParameters();
	for(var ii in g_DRIVES){
		/** @type {Element} */
		var opt = document.createElement("option");
		opt.value = ii;
		opt.innerText = g_DRIVES[ii].getName();
		if(drv){
			if(drv == ii){
				opt.selected = true;
			}
		}else{
			if(g_DRIVES[ii].isTarget(uparams)){
				drv = ii;
				opt.selected = true;
			}
		}
		sel.appendChild(opt);
	}

	if(g_storage.isReady()){
		if(g_storage.isSkipLogin()){
			getElement("#chkSkipLogin").checked = true;
		}
		if(g_storage.getDriveData("key_words")){
			getElement("#chkSaveKey").checked = true;
		}
	}else{
		hideElement("#divSkipLogin");
		hideElement("#divSaveKey");
	}

	// Load drive
	if(drv){
		await loadDrive(drv);
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
	var div = getElement("#divSet");
	/** @type {Element} */
	var sel = getElement("#selDrive");
	/** @type {Element} */
	var btn = getElement("btnLogout", div, "button.iid");

	if(evt){
		sel.disabled = true;
		showElement(btn);
		hideElement(".zb-nav-tools");
		hideElement("#divMain");
	}else{
		sel.disabled = false;
		hideElement(btn);
	}
	showElement(div);
}

/**
 * @param {string} lang
 * @return {!Promise<void>}
 */
async function changeLanguage(lang){
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
	await loadjs("msg/"+lang+".js", true);
	if(window["msgs"]){
		window["msgs"]["lang"] = lang;
		g_storage.setLanguage(lang);
		applyLanguage(window["msgs"]);
	}else{
		console.log("Message file of '"+lang+"' is missing.");
		if(old_msgs){
			window["msgs"] = old_msgs;
		}else{
			await loadjs("msg/en.js", true);
			if(window["msgs"]){
				window["msgs"]["lang"] = "en";
				g_storage.setLanguage(window["msgs"]["lang"]);
				applyLanguage(window["msgs"]);
			}else{
				showError("Message file is missing.");
			}
		}
	}
}
/**
 * @param {Object<string, string>} msgs
 */
function applyLanguage(msgs){
	// Patch message
	msgs["lblConfNotice"] = msgs["lblConfNotice"].replace("{0}", g_CONFILE);
	/**
	 * Set text for all elements
	 *
	 * @type {Array<Element>}
	 */
	var eles = getElementsByAttribute("*");
	/** @type {number} */
	var ii = 0;
	for(ii=0; ii<eles.length; ii++){
		/** @type {Element} */
		var ele = eles[ii];
		/** @type {?string} */
		var word = null;
		if(ele.hasAttribute("iid")){
			word = msgs[ele.getAttribute("iid")];
			if(word){
				ele.innerText = word;
			}
		}
		if(!word && ele.hasAttribute("vid")){
			word = msgs[ele.getAttribute("vid")];
			if(word){
				ele.value = word;
			}
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
		if(ele.hasAttribute("tid")){
			word = msgs[ele.getAttribute("tid")];
			if(word){
				ele.title = word;
			}
		}
	}

	/**
	 * Settings of language
	 *
	 * @type {Element}
	 */
	var sel = getElement("#seLang");
	/** @type {string} */
	var jj = "";
	for(jj in g_LANGUAGES){
		/** @type {Element} */
		var opt = document.createElement("option");
		opt.value = jj;
		opt.innerText = g_LANGUAGES[jj];
		if(jj == msgs["lang"]){
			opt.selected = true;
		}
		sel.appendChild(opt);
	}
}

/**
 * @param {string} drvnm
 * @return {!Promise<void>}
 */
async function loadDrive(drvnm){
	showInfo("loading");
	/** @type {ZbDriveDefine} */
	var drv = g_DRIVES[drvnm];
	if(drv){
		g_drive = drv.newDriveInstance(g_storage, g_AUTHURL);
	}else{
		showError("unkDrive");
		return;
	}
	/** @type {?string} */
	var a_err = await g_drive.login(true);
	if(a_err){
		if(a_err != "redirect"){
			await g_storage.clearLogInfo();
			showError(window["msgs"]["loginFailed"].replace("{0}", a_err));
		}
		return;
	}else{
		await g_storage.saveAllData();
	}

	// Set image of drive
	/** @type {Element} */
	var a_img = getElement("img", findParent("div", getElement("#spanQuota")));
	a_img.src = "img/"+drvnm+".png";
	a_img.alt = drv.getName();

	// Get configuration file.
	/** @type {Array<DriveItem>|undefined} */
	var b_dats = await g_drive.searchItems({
		_fname: g_CONFILE,
	}).catch(function(b_err){
		showError(JSON.stringify(b_err));
	});
	if(b_dats){
		if(b_dats.length == 0){
			showInputPassword(true);
		}else{
			await downloadConfile(b_dats[0]._id);
		}
	}
}
/**
 * Event called from html
 *
 * @return {!Promise<void>}
 */
async function saveSettings(){
	if(!getElement("#chkAgreeTos").checked){
		showError("noAgreeTos");
		return;
	}
	/** @type {string} */
	var clientId = "";
	/** @type {string} */
	var clientSecret = "";
	if(getElement("#chkOwnSecret").checked){
		clientId = getElement("#txtClientId").value;
		clientSecret = getElement("#txtClientSecret").value;
		if(!clientId || !clientSecret){
			showError("noClientIdS");
			return;
		}
	}
	/** @type {Element} */
	var sel = getElement("#selDrive");
	/** @type {boolean} */
	var needLoad = false;
	if(!sel.disabled){
		needLoad = g_storage.setDrive(sel.value);
	}
	/** @type {?DriveExtraInfo} */
	var dext = null;
	if(getElement("#chkOwnSecret").checked){
		dext = {
			_clientId: clientId,
			_clientSecret: clientSecret,
		};
	}
	g_storage.setDriveExInfo(dext);
	g_storage.setSkipLogin(getElement("#chkSkipLogin").checked);
	g_storage.setRelayUrl(getElement("#txtRelay").value);
	await changeLanguage(getElement("#seLang").value);
	if(needLoad){
		g_storage.clearSession();
		await loadDrive(sel.value);
	}else{
		await g_storage.saveAllData();
	}
	hideSettings();
}
/**
 * Event called from html
 */
function hideSettings(){
	/** @type {Element} */
	var sel = getElement("#selDrive");
	hideElement("#divSet");
	if(sel.disabled){
		showElement(".zb-nav-tools");
		showElement("#divMain");
	}
}

/**
 * @param {Event|boolean=} addroot
 * @param {boolean=} firstep
 */
function showAddRoot(addroot, firstep){
	/** @type {Element} */
	var div = getElement("#divPwd");
	/** @type {boolean} */
	var dispAdd = false;
	if(addroot){
		div.setAttribute("addroot", "1");
		dispAdd = true;
	}else{
		div.removeAttribute("addroot");
	}
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("*", div);
	/** @type {number} */
	var i = 0;
	for(i=0; i<eles.length; i++){
		/** @type {Element} */
		var ele = eles[i];
		if(ele.classList.contains("addroot")){
			if(dispAdd){
				showElement(ele);
			}else{
				hideElement(ele);
			}
		}else if(ele.classList.contains("firstep")){
			if(dispAdd && firstep){
				showElement(ele);
			}else{
				hideElement(ele);
			}
		}else if(ele.classList.contains("chgroot")){
			if(!dispAdd){
				showElement(ele);
			}else{
				hideElement(ele);
			}
		}
		if(ele.type == "password"){
			ele.value = "";
		}
	}
	clearKeyf();
}
/**
 * @param {Event} evt
 * @return {!Promise<void>}
 */
async function deleteRoot(evt){
	if(!window.confirm(window["msgs"]["delConfirm"])){
		return;
	}
	showInfo("deleting");

	/** @type {Element} */
	var sel = getElement("#selRoot");
	/** @type {string} */
	var root = sel.value;
	/** @type {number} */
	var rootidx = -1;
	g_conf.forEach(/** function(Object<string,(boolean|string)>, number) */(function(a_ele, a_idx){
		if(a_ele["root"] == root){
			rootidx = a_idx;
		}
	}));

	if(rootidx >= 0){
		/** @type {DriveSearchItemsOption} */
		var opt = {
			_fname: /** @type {string} */(g_conf[rootidx]["root"]),
		};
		/** @type {Array<DriveItem>|undefined} */
		var a_dats = await g_drive.searchItems(opt).catch(function(a_err){
			console.error(a_err);
		});
		if(a_dats){
			if(a_dats.length > 0){
				/** @type {DriveUpdateOption} */
				var a_opt = {
					/** @type {string} */
					_fid: a_dats[0]._id,
				};
				await g_drive.delete(a_opt).catch(function(a_err){
					showError(a_err);
				});
			}
			g_conf.splice(rootidx, 1);
			await uploadConfile(g_conf);
		};
	}

	if(rootidx == g_rootidx){
		window.location.reload();
	}else{
		/** @type {Array<Element>} */
		var a_eles = getElementsByAttribute("option", sel);
		/** @type {number} */
		var a_i = 0;
		for(a_i=0; a_i<a_eles.length; a_i++){
			/** @type {Element} */
			var a_ele = a_eles[a_i];
			if(a_ele.value == root){
				sel.removeChild(a_ele);
				break;
			}
		}
		if(rootidx < g_rootidx){
			g_rootidx--;
		}
		showNotify("delrootDone");
	}
}

/**
 * @param {Event|boolean=} firstep
 */
function showInputPassword(firstep){
	if(firstep){
		if(typeof firstep === "boolean"){
			showAddRoot(true, true);
		}else{
			showAddRoot();
			hideElement(".zb-nav-tools");
			hideElement("#divMain");
		}
	}else{
		showAddRoot();
	}
	showElement("#divPwd");
	hideMessage();
}
/**
 * Event called from html
 *
 * @param {Event=} evt
 */
function hideSetPwd(evt){
	hideElement("#divPwd");
	if(evt && g_paths.length > 0){
		showElement(".zb-nav-tools");
		showElement("#divMain");
	}
}

/**
 * Event called from html
 */
function moreKeyf(){
	/** @type {Element} */
	var div = nextElement(findParent("div"));
	/** @type {Element} */
	var inp = div.children[0].cloneNode(true);
	inp.value = "";
	div.appendChild(inp);
}
/**
 * Event called from html
 */
function clearKeyf(){
	/** @type {Element} */
	var div = getElement("#divfKey");
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("file", div, "input.type");
	/** @type {number} */
	var i = 0;
	for(i=eles.length-1; i>0; i--){
		eles[i].remove();
	}
	eles[0].value = "";
}
/**
 * Event called from html
 * @return {!Promise<void>}
 */
async function setPassword(){
	showInfo("loading");

	/** @type {boolean} */
	var addroot = getElement("#divPwd").hasAttribute("addroot");
	/** @type {string} */
	var pwdKey = getElement("#pwdKey").value;
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("input", getElement("#divfKey"));
	/** @type {Array<File>} */
	var fKey = new Array();
	/** @type {number} */
	var i = 0;
	/** @type {number} */
	var j = 0;
	for(i=0; i<eles.length; i++){
		/** @type {Array<File>} */
		var a_fs = eles[i].files;
		for(j=0; j<a_fs.length; j++){
			fKey.push(a_fs[j]);
		}
	}
	if(!(pwdKey || fKey.length > 0)){
		showError("noPwd");
		return;
	}
	if(addroot){
		/** @type {string} */
		var pwdKeyRe = getElement("#pwdKeyRe").value;
		if(pwdKey || pwdKeyRe){
			if(pwdKey != pwdKeyRe){
				showError("diffPwd");
				return;
			}
		}
		if(!getElement("#txtRoot").value){
			showError("noRoot");
			return;
		}
	}

	/** @type {string} */
	var words = "";
	if(pwdKey){
		words = forge.util.encodeUtf8(pwdKey);
	}
	if(fKey.length > 0){
		/** @type {FileReader} */
		var reader = FileReader.zbPreparePromise();
		/** @type {forge.md.digest} */
		var hash = forge.hmac.create();
		hash.start("sha512", "zb12");
		i = 0;
		while(i < fKey.length){
			/** @type {ArrayBuffer} */
			var kdat = await reader.zbReadAsArrayBuffer(fKey[i].slice(0, 1023));
			hash.update(u8arrToRaw(new Uint8Array(kdat)));
			i++;
		}
		words += hash.digest().getBytes();
	}
	await checkPassword(words, addroot);
}
/**
 * @param {string} keyWords
 * @param {boolean=} addroot
 * @return {!Promise<void>}
 */
async function checkPassword(keyWords, addroot){
	/** @type {forge.md.digest} */
	var hash = forge.hmac.create();
	hash.start("md5", g_HASHKEY);
	hash.update(keyWords);
	/** @type {string} */
	var hmac = rawToBase64url(hash.digest().getBytes()).substring(0, 8);
	/** @type {string} */
	var rkeys = "";
	if(addroot){
		/** @type {Object<string, (string|boolean)>} */
		var conf = {
			"root": getElement("#txtRoot").value,
		};
		if(getElement("#chkEncryFname").checked){
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
			await g_storage.saveDriveData("root", /** @type {string} */(conf["root"]));
			await saveKeyData(keyWords);
		}
		rkeys = forge.random.getBytesSync(1024);
		g_keycfg = zbCreateCfg(rkeys);
		conf["iv"] = hmac.concat(cryptoRKeys(true, rkeys, keyWords));
		g_rootidx = g_conf.length;
		g_conf.push(conf);
		appendRootItem(conf, true);
		await uploadConfile(g_conf);
		await checkRootFolder();
	}else{
		/** @type {string} */
		var a_root = getElement("#selRoot").value;
		/** @type {number} */
		var a_rootidx = -1;
		g_conf.forEach(/** function(Object<string,(boolean|string)>, number) */(function(b_ele, b_idx){
			if(b_ele["root"] == a_root){
				a_rootidx = b_idx;
			}
		}));
		if(a_rootidx >= 0 && g_conf[a_rootidx]["iv"] && hmac == g_conf[a_rootidx]["iv"].slice(0, hmac.length)){
			g_rootidx = a_rootidx;
			await g_storage.saveDriveData("root", a_root);
			await saveKeyData(keyWords);
			rkeys = cryptoRKeys(false, g_conf[g_rootidx]["iv"].slice(hmac.length), keyWords);
			g_keycfg = zbCreateCfg(rkeys);
			await checkRootFolder();
		}else if(isVisible(getElement("#divPwd"))){
			showError("pwdError");
		}else{
			showInputPassword();
		}
	}
}
/**
 * @param {boolean} encFlg
 * @param {string} rkeys
 * @param {string} keyWords
 * @return {string}
 */
function cryptoRKeys(encFlg, rkeys, keyWords){
	/** @type {AesSecrets} */
	var cfg = zbCreateCfg(keyWords);
	/** @type {string} */
	var dat1 = encFlg ? rkeys : base64urlToRaw(rkeys);
	/** @type {string} */
	var dat = zbDataCrypto(encFlg, dat1, cfg);
	if(encFlg){
		return rawToBase64url(dat);
	}else{
		return dat;
	}
}

/**
 * @param {Array<Object<string, (string|boolean)>>} conf
 * @return {!Promise<void>}
 */
async function uploadConfile(conf){
	/** @type {Uint8Array} */
	var words = forge.util.text.utf8.encode(JSON.stringify(conf));
	/** @type {Blob} */
	var blob = new Blob([words], { "type" : "application/octet-binary" });
	/** @type {ZBlobReader} */
	var reader = new ZBlobReader({
		_blob: blob,
		_bufSize: 256*1024, // This a requirement of google drive, which is "The number of bytes uploaded is required to be equal or greater than 262144".
	});
	/** @type {ZBWriter} */
	var writer = g_drive.createWriter({
		_fnm: g_CONFILE,
	});
	await zbPipe(reader, writer, undefined);
}
/**
 * @param {string} fid
 * @return {!Promise<void>}
 */
async function downloadConfile(fid){
	/** @type {ZBReader} */
	var reader = g_drive.createReader({
		_id: fid,
	});
	/** @type {ZBWriter} */
	var writer = new ZBlobWriter();
	await zbPipe(reader, writer, undefined);
	/** @type {string} */
	var a_words = forge.util.decodeUtf8(u8arrToRaw(writer.getBuffer()));
	var a_conf = JSON.parse(a_words);
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
	var a_sel = getElement("#selRoot");
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
			/** @type {Object<string, (string|boolean)>|undefined} */
			var b_lskdat = await fetchLocalStorageAuth().catch(function(b_err){
				showError(b_err);
			});
			if(b_lskdat){
				if(b_lskdat && b_lskdat["lsauth"] && !b_lskdat["newkey"]){
					/** @type {string} */
					var b_keywords = zbDataCrypto(false, base64urlToRaw(/** @type {string} */(a_kw)), /** @type {string} */(b_lskdat["lsauth"]));
					await checkPassword(b_keywords);
					return;
				}
			}
		}
	}else{
		g_rootidx = 0;
	}
	showInputPassword();
}
/**
 * @param {Object<string, (string|boolean)>} _conf
 * @param {boolean=} _selected
 * @param {Element=} _sel
 */
function appendRootItem(_conf, _selected, _sel){
	/** @type {Element|undefined} */
	var sel = _sel || getElement("#selRoot");
	/** @type {Element} */
	var opt = document.createElement("option");
	opt.value = _conf["root"];
	opt.innerText = _conf["root"];
	if(_selected){
		opt.selected = true;
	}
	sel.appendChild(opt);
}
/**
 * Event called from html
 */
async function dropLoacalDb(){
	if(!window.confirm(window["msgs"]["dropConfirm"])){
		return;
	}
	await g_storage.dropIdxDb().catch(function(a_err){
		showError(a_err);
	});
	await g_drive.logout();
}

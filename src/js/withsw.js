/** @type {boolean} */
var g_swReady = false;

/**
 * @param {Event} evt // MessageEvent
 * @return {!Promise<void>}
 */
async function handleServiceWorkerMessage(evt){
	var actinf = /** @type {SWActionInfo} */(evt.data);
	switch(actinf.action){
	case SWorkerAction.PREPARE:
		if(actinf.msg){
			console.error(actinf.msg);
			showError(actinf.msg);
		}else{
			g_swReady = true;
		}
		break;
	case SWorkerAction.SHOWERR:
		if(actinf.msg){
			console.error(actinf.msg);
			showError(actinf.msg);
		}
		break;
	}
}

/**
 * @return {!Promise<boolean>}
 */
async function registerServiceWorker(){
	if(navigator.serviceWorker){
		await navigator.serviceWorker.register(g_SWPATH + "sw.js");
		await navigator.serviceWorker.ready;
		navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

		/** @type {SWActionInfo} */
		var actinf = {
			action: SWorkerAction.PREPARE,
			cominf: {
				gtoken: g_drive.getToken(),
				iv: g_keycfg["iv"].toString(CryptoJS.enc.Base64url),
				key: g_keycfg["key"].toString(CryptoJS.enc.Base64url),
				drvid: g_drive.getId(),
			},
		};
		navigator.serviceWorker.controller.postMessage(actinf);

		return true;
	}else{
		return false;
	}
}

/**
 * @return {!Promise<boolean>}
 */
async function unregisterServiceWorker(){
	if(!navigator.serviceWorker){
		console.error("no service worker");
		return false;
	}
	/** @type {ServiceWorkerRegistration|undefined} */
	var swr = await navigator.serviceWorker.getRegistration();
	if(!swr){
		console.error("no service worker registration");
		return false;
	}
	/** @type {boolean} */
	var ret = await swr.unregister();
	if(ret){
		console.debug("service worker uninstalled.");
	}
	return ret;
}

/**
 * @param {string} fnm
 * @param {string} fid
 * @return {string}
 */
function getFileUrl(fnm, fid){
	/** @type {string} */
	var url = g_SWPATH;
	/** @type {string} */
	var sfx = getSfx(fnm);
	if(g_imagetypes[sfx]){
		url += g_imagetypes[sfx];
	}else if(g_videotypes[sfx]){
		url += g_videotypes[sfx];
	}else if(g_audiotypes[sfx]){
		url += g_audiotypes[sfx];
	}else{
		url += "binary/octet-stream";
	}

	return url += "/" + fid;
}
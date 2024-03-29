/**
 * @param {Event} evt // MessageEvent
 * @return {!Promise<void>}
 */
async function handleServiceWorkerMessage(evt){
	var actinf = /** @type {SWActionInfo} */(evt.data);
	switch(actinf.action){
	case SWorkerAction.PREPARE:
		actinf.cominf = {
			gtoken: g_drive.getToken(),
			iv: rawToBase64url(g_keycfg.iv),
			key: rawToBase64url(g_keycfg.key),
			drvid: g_drive.getId(),
			encfname: isEncfname(),
		};
		navigator.serviceWorker.controller.postMessage(actinf);
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
		/** @type {ServiceWorkerRegistration} */
		var swr = await navigator.serviceWorker.register("sw.js");
		await navigator.serviceWorker.ready;
		navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

		/** @type {Element} */
		var ele = getElement("btnUnregSw", undefined, "button.iid");
		showElement(ele);

		return true;
	}else{
		return false;
	}
}

/**
 * @param {string} fid
 */
function releaseSwReader(fid){
	if(navigator.serviceWorker){
		/** @type {SWActionInfo} */
		var actinf = {
			action: SWorkerAction.RELEASEREADER,
			fid: fid,
		};
		navigator.serviceWorker.controller.postMessage(actinf);
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
	if(!window.confirm(window["msgs"]["unswConfirm"])){
		return false;
	}
	/** @type {boolean} */
	var ret = await swr.unregister();
	if(ret){
		console.debug("service worker uninstalled.");
	}
	/** @type {Element} */
	var ele = getElement("btnUnregSw", undefined, "button.iid");
	hideElement(ele);
	return ret;
}

/**
 * @return {boolean}
 */
function isSwReady(){
	if(navigator.serviceWorker && navigator.serviceWorker.controller){
		return true;
	}else{
		return false;
	}
}
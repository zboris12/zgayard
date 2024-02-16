/** @define {boolean} */
var FOROUTPUT = false;
self.importScripts("vendor/crypto-js.js");
if(!FOROUTPUT){
	self.importScripts("js/const.js");
	self.importScripts("js/zbcommon.js");
	self.importScripts("js/zbcrypto.js");
	self.importScripts("js/zbidxdb.js");
	self.importScripts("js/zbdrive.js");
	self.importScripts("js/zbonedrive.js");
	self.importScripts("js/zbgoogledrive.js");
	self.importScripts("js/zbidxbdrive.js");
	self.importScripts("js/worker-const.js");
}

window = self;
/** @const {string} */
const g_VERSION = "0.0.1";
/** @const {number} */
const g_BUFSIZE = 800000;
/** @type {ZbLocalStorage} */
var g_storage = null;
/** @type {Map<string, SWCacheData>} */
var g_cache = new Map();

/**
 * @return {!Promise<ZbLocalStorage>}
 */
function initIdxDb(){
	return new Promise(function(resolve, reject){
		/** @type {ZbLocalStorage} */
		var stg = new ZbLocalStorage();
		stg.initIdxDb(function(a_err){
			if(a_err){
				reject(a_err);
			}else{
				resolve(stg);
			}
		});
	});
}

/**
 * @param {string} cid client id.
 * @param {SWActionInfo} msgdat
 * @return {!Promise<void>}
 */
async function postClientMessage(cid, msgdat){
	/** @type {ServiceWorkerClient!|undefined} */
	var clt = await /** @type {ServiceWorkerGlobalScope} */(self).clients.get(cid);
	if(clt){
		clt.postMessage(msgdat);
	}
}

/**
 * @param {string} cid client id.
 * @param {WorkerCommonInfo} cinf
 * @return {!Promise<string>}
 */
async function prepare(cid, cinf){
	/** @type {string} */
	var msg = "";
	try{
		if(g_cache.get(cid)){
			return msg;
		}

		var keycfg = /** @type {CipherParams} */({
			"iv": CryptoJS.enc.Base64url.parse(cinf.iv),
			"key": CryptoJS.enc.Base64url.parse(cinf.key),
		});
		if(!g_storage){
			g_storage = await initIdxDb();
		}
		/** @type {ZbDriveDefine} */
		var drvdef = g_DRIVES[cinf.drvid];
		if(drvdef){
			/** @type {ZbDrive} */
			var drv = drvdef.newDriveInstance(g_storage, g_AUTHURL);
			drv.presetToken(cinf.gtoken);
			g_cache.set(cid, {
				_drive: drv,
				_keycfg: keycfg,
				_readers: new Map(),
			});

		}else{
			msg = "Drive's name is invalid.";
		}
	}catch(err){
		console.error(err);
		msg = err.message || err;
	}

	return msg;
}

/**
 * @param {Event} evt // ExtendableMessageEvent
 * @return {!Promise<void>}
 */
async function handleClientMessage(evt){
	/** @type {string} */
	var cid = /** @type {ExtendableMessageEvent} */(evt).source.id;
	var actinf = /** @type {SWActionInfo} */(evt.data);
	switch(actinf.action){
	case SWorkerAction.PREPARE:
		var cinf = /** @type {WorkerCommonInfo} */(actinf.cominf);
		/** @type {string} */
		var msg = await prepare(cid, cinf);
		await postClientMessage(cid, {
			action: actinf.action,
			msg: msg,
		});
		break;
	case SWorkerAction.RELEASEREADER:
		/** @type {SWCacheData} */
		var cache = g_cache.get(cid);
		/** @type {string|undefined} */
		var fid = actinf.fid;
		if(cache && fid){
			cache._readers.delete(fid);
		}
		break;
	}
}

/**
 * @param {number} sts
 * @param {Headers!=} hdrs
 * @return {ResponseInit!}
 */
function createResponseInit(sts, hdrs){
	/** @const {Map<number, string>} */
	const STATUS_MAP = new Map([
		[200, "OK"],
		[206, "Partial Content"],
		[404, "Not Found"],
		[500, "Internal Server Error"],
		[503, "Service Unavailable"],
	]);
	return {
		status: sts,
		statusText: STATUS_MAP.get(sts),
		headers: hdrs,
	};
}
/**
 * @param {number} sts
 * @param {string} msg
 * @param {string=} cid
 * @return {Response}
 */
function createErrorResponse(sts, msg, cid){
	if(cid){
		postClientMessage(cid, {
			action: SWorkerAction.SHOWERR,
			msg: msg,
		});
	}
	return new Response(msg, createResponseInit(sts));
}

/**
 * @param {string?} rngstr
 * @return {FetchRange}
 */
function analyzeRange(rngstr){
	/** @type {number} */
	var from = 0;
	/** @type {number} */
	var to = -1;
	if(rngstr && rngstr.substring(0, 6) == "bytes="){
		rngstr = rngstr.substring(6);
		/** @type {number} */
		var i = rngstr.indexOf(",");
		if(i > 0){
			rngstr = rngstr.substring(0, i);
		}
		/** @type {Array<string>} */
		var arr = rngstr.split("-");
		if(arr.length > 0){
			from = parseInt(arr[0], 10);
			if(arr.length > 1 && arr[1]){
				to = parseInt(arr[1], 10) + 1;
			}
		}
	}
	return {
		_from: from,
		_to: to,
	};
}

/**
 * @param {FetchEvent} evt
 * @param {string} ctyp
 * @param {string} fid
 * @return {!Promise<Response>}
 */
async function swFetchData(evt, ctyp, fid){
	if(!(ctyp && fid)){
		return createErrorResponse(404, "Unkown url format.");
	}
	if(!evt.clientId){
		return createErrorResponse(503, "Missing client id.");
	}
	/** @type {SWCacheData} */
	var cache = g_cache.get(evt.clientId);
	if(!cache){
		return createErrorResponse(503, "Not ready for decryption.", evt.clientId);
	}

	try{
		/** @type {ZbCryptoReader} */
		var rdr = cache._readers.get(fid);
		if(!rdr){
			rdr = new ZbCryptoReader({
				_decrypt: true,
				_keycfg: cache._keycfg,
				_reader: cache._drive.createReader({
					_id: fid,
				}),
			});
			cache._readers.set(fid, rdr);
		}

		await rdr.lock();

		/** @type {FetchRange} */
		var range = analyzeRange(evt.request.headers.get("range"));
		/** @type {number} */
		var wsize = await rdr.calcWholeSize();
		range._to = Math.min(range._to < 0 ? wsize : range._to, range._from + g_BUFSIZE);

		/** @type {Array<number>} */
		var dat = await rdr.read(range._from, range._to - range._from);
		rdr.unlock();

		/** @type {number} */
		var to = range._from + dat.length - 1;
		/** @type {Headers} */
		var hdrs = new Headers();
		hdrs.append("Content-Length", dat.length.toString());
		hdrs.append("Content-Type", ctyp);
		if(range._from == 0 && dat.length == wsize){
			return new Response(new Uint8Array(dat), createResponseInit(200, hdrs));

		}else{
			hdrs.append("Accept-Ranges", "bytes");
			hdrs.append("Content-Range", `bytes ${range._from}-${to}/${wsize}`);
			return new Response(new Uint8Array(dat), createResponseInit(206, hdrs));
		}

	}catch(err){
		return createErrorResponse(500, err.message || err, evt.clientId);
	}
}

self.addEventListener("message", handleClientMessage);
self.addEventListener("activate", function(evt){
	evt.waitUntil(/** @type {ServiceWorkerGlobalScope} */(self).clients.claim());
});
self.addEventListener("fetch", function(evt){
	/** @type {string} */
	var str = evt.request.url;
	/** @type {number} */
	var idx = str.indexOf(g_SWPATH);
	if(idx < 0){
		return;
	}

	/** @type {string} */
	var ctyp = "";
	/** @type {string} */
	var fid = "";

	str = str.substring(idx + g_SWPATH_LEN);
	idx = str.indexOf("/");
	if(idx > 0){
		idx = str.indexOf("/", idx + 1);
	}
	if(idx > 0){
		ctyp = str.substring(0, idx);
		fid = str.substring(idx + 1);
	}
	evt.respondWith(swFetchData(/** @type {FetchEvent} */(evt), ctyp, fid));
});

window = self;
/** @define {boolean} */
var FOROUTPUT = false;
self.importScripts("vendor/forge.min.js");
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

/** @const {number} */
const g_BUFSIZE = 800000;
/** @type {ZbLocalStorage} */
var g_storage = null;
/** @type {?SWCacheData} */
var g_cache = null;
/** @type {?function(string):void} */
var g_resolve = null;

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
 * @param {WorkerCommonInfo} cinf
 * @return {!Promise<string>}
 */
async function prepare(cinf){
	/** @type {string} */
	var msg = "";
	try{
		/** @type {AesSecrets} */
		var keycfg = {
			iv: base64urlToRaw(cinf.iv),
			key: base64urlToRaw(cinf.key),
		};
		if(!g_storage){
			g_storage = await initIdxDb();
		}
		/** @type {ZbDriveDefine} */
		var drvdef = g_DRIVES[cinf.drvid];
		if(drvdef){
			/** @type {ZbDrive} */
			var drv = drvdef.newDriveInstance(g_storage, g_AUTHURL);
			drv.presetToken(cinf.gtoken);
			g_cache = {
				_drive: drv,
				_keycfg: keycfg,
				_encfname: cinf.encfname,
				_readers: new Map(),
			};

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
 * @param {string} cid
 * @return {!Promise<string>}
 */
function requestPrepare(cid){
	return new Promise(function(resolve, reject){
		if(g_resolve){
			resolve("A conflict has occurred.");
		}else{
			g_resolve = resolve;
			postClientMessage(cid, {
				action: SWorkerAction.PREPARE,
			});
		}
	});
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
		var msg = await prepare(cinf);
		if(g_resolve){
			g_resolve(msg);
			g_resolve = null;
		}else if(msg){
			await postClientMessage(cid, {
				action: SWorkerAction.SHOWERR,
				msg: msg,
			});
		}
		break;
	case SWorkerAction.RELEASEREADER:
		/** @type {string|undefined} */
		var fid = actinf.fid;
		if(g_cache && fid){
			/** @type {SWReaderInfo} */
			var rinf = g_cache._readers.get(fid);
			if(rinf){
				g_cache._readers.delete(fid);
				/** @type {boolean} */
				var lok = await rinf._reader.lock(true);
				if(lok){
					rinf._reader.dispose();
				}
			}
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
		[409, "Conflict"],
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
 * @param {string} fid
 * @return {!Promise<Response>}
 */
async function swFetchData(evt, fid){
	if(!fid){
		return createErrorResponse(404, "Unkown url format.");
	}
	var cid = /** @type {string} */(evt.clientId || evt.resultingClientId);
	if(!cid){
		return createErrorResponse(503, "Missing client id.");
	}
	if(!g_cache){
		/** @type {string} */
		var msg = await requestPrepare(cid);
		if(msg){
			return createErrorResponse(503, msg, cid);
		}
	}

	try{
		/** @type {SWReaderInfo} */
		var rinf = g_cache._readers.get(fid);
		/** @type {ZbCryptoReader} */
		var rdr = null;
		if(rinf){
			rdr = rinf._reader;
		}else{
			rdr = new ZbCryptoReader({
				_decrypt: true,
				_keycfg: g_cache._keycfg,
				_reader: g_cache._drive.createReader({
					_id: fid,
				}),
			});
			rinf = {
				_ctype: "",
				_fnm: "",
				_reader: rdr,
			};
			g_cache._readers.set(fid, rinf);
		}

		/** @type {boolean} */
		var lok = await rdr.lock();
		if(!lok){
			return createErrorResponse(409, "The reader will be disposed.");
		}

		/** @type {FetchRange} */
		var range = analyzeRange(evt.request.headers.get("range"));
		/** @type {number} */
		var wsize = await rdr.calcWholeSize();
		if(!rinf._fnm){
			rinf._fnm = /** @type {string} */(rdr.getName());
			if(g_cache._encfname){
				rinf._fnm = zbDecryptString(rinf._fnm, g_cache._keycfg);
			}
			/** @type {string} */
			var sfx = getSfx(rinf._fnm);
			rinf._ctype = g_videotypes[sfx] || g_audiotypes[sfx] || g_imagetypes[sfx] || "binary/octet-stream";
			// console.debug(rinf._fnm, rinf._ctype);
		}
		range._to = Math.min(range._to < 0 ? wsize : range._to, range._from + g_BUFSIZE);

		/** @type {string} */
		var dat = await rdr.read(range._from, range._to - range._from);
		rdr.unlock();

		/** @type {number} */
		var to = range._from + dat.length - 1;
		/** @type {Headers} */
		var hdrs = new Headers();
		hdrs.append("Content-Length", dat.length.toString());
		hdrs.append("Content-Type", rinf._ctype);
		if(range._from == 0 && dat.length == wsize){
			return new Response(rawToU8arr(dat), createResponseInit(200, hdrs));

		}else{
			hdrs.append("Accept-Ranges", "bytes");
			hdrs.append("Content-Range", `bytes ${range._from}-${to}/${wsize}`);
			return new Response(rawToU8arr(dat), createResponseInit(206, hdrs));
		}

	}catch(err){
		return createErrorResponse(500, err.message || err, cid);
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
	var idx = str.indexOf("/" + g_SWPATH);
	if(idx < 0){
		return;
	}
	str = str.substring(idx + g_SWPATH_LEN + 1);
	evt.respondWith(swFetchData(/** @type {FetchEvent} */(evt), str));
});

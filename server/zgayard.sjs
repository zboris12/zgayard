/**
 * @constructor
 * @param {Object<string, *>} lib
 * @param {Object<string, string>} consts
 */
function GrantAuth(lib, consts){
	/** @private @type {Object<string, *>} */
	this.lib = lib;
	/** @private @type {Object<string, string>} */
	this.cs = consts;
	/** @private @type {boolean} */
	this.localhost = false;
	/** @private @type {string} */
	this.redirectUri = null;
	/** @private @type {http.IncomingMessage} */
	this.req = null;
	/** @private @type {http.ServerResponse} */
	this.res = null;
	/** @private @type {Object<string, string>} */
	this.fields = {};
	/** @private @type {Object<string, string>} */
	this.cookies = {};
}
/**
 * @public
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
GrantAuth.prototype.process = function(req, res){
	/** @const {GrantAuth} */
	const _this = this;
	/** @type {string} */
	var ourl = req.headers["origin"];
	/** @type {number} */
	var l = ourl.length;
	/** @type {number} */
	var i = 0;
	for(i=0; i<_this.cs.REDIRECT_URIS.length; i++){
		if(_this.cs.REDIRECT_URIS[i].substring(0, l) == ourl){
			_this.redirectUri = _this.cs.REDIRECT_URIS[i];
			if(i == 0){
				_this.localhost = true;
			}
			break;
		}
	}
	if(!_this.redirectUri){
		ourl = _this.getBaseUrl(_this.cs.REDIRECT_URIS[0]);
	}
	res.setHeader("Access-Control-Allow-Origin", ourl);
	res.setHeader("Access-Control-Allow-Credentials", "true");
	res.setHeader("Content-Type", "application/json;charset=UTF-8");

	var bb = _this.loadLib("busboy")({
		headers: req.headers
	});
	bb.on("field", function(a_name, a_val, a_info){
		_this.fields[a_name] = a_val;
	});
	bb.on("close", _this.grantauth.bind(_this));

	if(req.headers["cookie"]){
		_this.cookies = _this.loadLib("cookie").parse(req.headers["cookie"]);
	}
	_this.req = req;
	_this.res = res;
	_this.req.pipe(bb);
};
/**
 * @private
 */
GrantAuth.prototype.grantauth = function(){
	/** @const {GrantAuth} */
	const _this = this;
	switch(_this.fields["drive_type"]){
	case "localstorage":
		/** @type {Object} */
		var result = _this.getLocalStorageAuth();
		_this.endProcess(result);
		break;
	case "onedrive":
		//https://docs.microsoft.com/ja-jp/azure/active-directory/develop/v2-oauth2-auth-code-flow
		_this.getDriveAuth({
			"client_id": _this.cs.ONEDRIVE_CLIENT_ID,
			"client_secret": _this.cs.ONEDRIVE_CLIENT_SECRET,
			"login_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
			"login_scope": "offline_access files.readwrite",
			"token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
			"token_scope": "files.readwrite",
			"logout_url": "https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=" + _this.redirectUri,
		});
		break;
	case "googledrive":
		_this.getDriveAuth({
			"client_id": _this.cs.GOOGDRIVE_CLIENT_ID,
			"client_secret": _this.cs.GOOGDRIVE_CLIENT_SECRET,
			"login_url": "https://accounts.google.com/o/oauth2/v2/auth",
			"login_scope": "https://www.googleapis.com/auth/drive.file",
			"login_extdat": {
				"access_type": "offline",
				"prompt": "consent"
			},
			"token_url": "https://www.googleapis.com/oauth2/v4/token",
			"token_scope": "https://www.googleapis.com/auth/drive.file",
			"logout_url": "https://accounts.google.com/Logout",
		});
		break;
	default:
		_this.endProcess({
			"error": "invalid_drive_type",
			"error_description": "Unknown drive type.",
		});
	}
};
/**
 * @private
 * @param {string|Object} result
 */
GrantAuth.prototype.endProcess = function(result){
	/** @const {GrantAuth} */
	const _this = this;
	_this.res.statusCode = 200;
	_this.res.statusMessage = "POST OK";
	if(typeof result == "string"){
		_this.res.end(result);
	}else{
		_this.res.end(JSON.stringify(result));
	}
};
/**
 * @private
 * @param {boolean=} keyOnly
 * @return {string|Object}
 */
GrantAuth.prototype.getLocalStorageAuth = function(keyOnly){
	/** @const {GrantAuth} */
	const _this = this;
	/** @const {forge} */
	const forge = _this.loadLib("node-forge");
	/** @type {string} */
	var lskey64 = _this.cookies["lskey"];
	/** @type {boolean} */
	var newkey = false;
	/** @type {string} */
	var lskey = "";
	if(lskey64){
		lskey = forge.util.decode64(lskey64);
	}else{
		lskey = forge.random.getBytesSync(20);
		lskey64 = forge.util.encode64(lskey);
		newkey = true;
	}
	/** @type {string} */
	var samesite = "";
	/** @type {boolean} */
	var sec = false;
	if(_this.localhost){
		samesite = "Strict";
		sec = false;
	}else{
		samesite = "None";
		sec = true;
	}
	_this.res.setHeader("Set-Cookie", _this.loadLib("cookie").serialize("lskey", lskey64, {
		"httpOnly": true,
		"maxAge": 86400 * _this.cs.COOKIE_MAXAGE,
		"path": "/",
		"sameSite": samesite,
		"secure": sec,
	}));

	if(keyOnly){
		return lskey;
	}else{
		/** @type {string} */
		var keyval = _this.hmac(lskey);
		return {
			"newkey": newkey,
			"lsauth": keyval,
		};
	}
};
/**
 * @private
 * @param {string} data
 * @param {boolean=} encrypt
 * @return {string}
 */
GrantAuth.prototype.cryptData = function(data, encrypt){
	/** @const {GrantAuth} */
	const _this = this;
	/** @const {forge} */
	const forge = _this.loadLib("node-forge");
	/** @const {number} */
	const ivlen = 16;
	/** @type {string} */
	var iv = _this.cs.CRYPT_IV.substring(0, ivlen);
	/** @type {string} */
	var lskey = _this.getLocalStorageAuth(true) + _this.cs.CRYPT_IV.substring(ivlen);
	/** @type {Array<string>} */
	var cinfarr = _this.cs.CRYPT_METHOD.split("-");
	/** @type {string} */
	var cmthd = "AES-CBC";
	/** @type {number} */
	var keylen = 16;
	if(cinfarr.length == 3){
		cmthd = cinfarr[0] + "-" + cinfarr[2];
		if(cinfarr[1] == "192" || cinfarr[1] == "256"){
			keylen = parseInt(cinfarr[1], 10) / 8;
		}
	}
	/** @type {forge.md} */
	var md = forge.md.sha256.create();
	md.update(lskey);
	/** @type {forge.util.ByteStringBuffer} */
	var key = md.digest();
	key.truncate(key.length() - keylen);
	/** @type {forge.cipher.BlockCipher} */
	var cipher = null;
	if(encrypt){
		cipher = forge.cipher.createCipher(cmthd, key);
	}else{
		cipher = forge.cipher.createDecipher(cmthd, key);
		data = forge.util.decode64(data);
	}
	/** @type {forge.util.ByteStringBuffer} */
	var buff = forge.util.createBuffer(data);
	cipher.start({iv: iv});
	cipher.update(buff);
	cipher.finish();
	/** @type {string} */
	var dataOut = cipher.output.getBytes();
	if(encrypt){
		dataOut = forge.util.encode64(dataOut);
	}
	return dataOut;
};
/**
 * @private
 * @param {Object<string, string>} infs
 */
GrantAuth.prototype.getDriveAuth = function(infs){
	/** @const {GrantAuth} */
	const _this = this;
	/** @const {querystring} */
	const qs = _this.loadLib("querystring");
	/** @type {Object<string, string>} */
	var data = {
		"client_id": _this.fields["client_id"] ? _this.fields["client_id"] : infs["client_id"],
		"redirect_uri": _this.fields["redirect_uri"] ? _this.fields["redirect_uri"] : _this.redirectUri,
	};
	/** @type {string} */
	var action = _this.fields["action"];
	/** @type {string} */
	var cscenc = null;
	/** @type {function(Object<string, string>)} */
	var endauth = function(a_result){
		a_result["logout"] = infs["logout_url"];
		if(cscenc){
			a_result["client_secret_enc"] = cscenc;
		}
		_this.endProcess(a_result);
	};
	if(action && action.toLowerCase() == "logout"){
		endauth({});
	}else{
		/** @type {string} */
		var csc = _this.fields["client_secret"];
		if(csc){
			if(_this.localhost){
				console.log("Using customized client informations.");
			}
			if(csc.length > 4 && csc.substring(0, 2) == "zB"){
				cscenc = csc.substring(4);
				if(_this.hmac(cscenc).substring(5, 7) == csc.substring(2, 4)){
					if(_this.localhost){
						console.log("Decrypting client secret.");
					}
					csc = _this.cryptData(cscenc, false);
				}else{
					cscenc = null;
				}
			}
			if(cscenc){
				cscenc = null;
			}else{
				if(_this.localhost){
					console.log("Encrypting client secret.");
				}
				cscenc = _this.cryptData(csc, true);
				cscenc = "zB" + _this.hmac(cscenc).substring(5, 7) + cscenc;
			}
		}else{
			csc = infs["client_secret"];
		}

		/** @type {string} */
		var code = _this.fields["code"];
		/** @type {string} */
		var rftoken = _this.fields["refresh_token"];
		if(code || rftoken){
			/** @type {string} */
			var base_url = infs["token_url"];
			/** @type {URL} */
			var opts = _this.loadLib("url").parse(base_url);
			opts["headers"] = {
				"Content-Type": "application/x-www-form-urlencoded",
			};
			data["scope"] = infs["token_scope"];
			data["client_secret"] = csc;
			if(code){
				data["code"] = code;
				data["grant_type"] = "authorization_code";
			}else{
				data["refresh_token"] = _this.cryptData(rftoken, false);
				data["grant_type"] = "refresh_token";
			}
			/** @type {string} */
			var postData = qs.stringify(data);
			
			opts["method"] = "POST";
			opts["headers"] = {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": Buffer.byteLength(postData),
			};
			/** @type {http.ClientRequest} */
			var hreq = _this.loadLib(opts["protocol"]).request(opts, function(/** @type {http.IncomingMessage} */a_hres){
				/** @type {Array} */
				var a_bufs = [];
				/** @type {number} */
				var a_bufs_len = 0;
				a_hres.on("data", function(b_chunk){
					a_bufs.push(b_chunk);
					a_bufs_len += b_chunk.length;
				});
				a_hres.on("end", function(){
					/** @type {Object} */
					var b_dat = null;
					try{
						b_dat = JSON.parse(Buffer.concat(a_bufs, a_bufs_len));
					}catch(b_ex){
						if(_this.localhost){
							console.log(b_ex);
						}
					}
					/** @type {Object<string, string>} */
					var b_result = null;
					if(b_dat){
						b_result = b_dat;
						if(b_dat["refresh_token"]){
							b_result["refresh_token"] = _this.cryptData(b_dat["refresh_token"], true);
						}
					}else{
						b_result = {
							"error": "auth_failed",
							"error_description": "Failed to connect base_url.",
						};
					}
					endauth(b_result);
				});
			});
			hreq.end(postData);

		}else{
			data["scope"] = infs["login_scope"];
			if(_this.fields["need_code"]){
				data["response_type"] = "code";
				if(infs["login_extdat"]){
					Object.assign(data, infs["login_extdat"]);
				}
			}else{
				data["response_type"] = "token";
			}
			/** @const {forge} */
			const forge = _this.loadLib("node-forge");
			/** @type {string} */
			var state = forge.random.getBytesSync(20);
			/** @type {string} */
			var state64 = forge.util.encode64(state);
			endauth({
				"url": infs["login_url"] + "?" + qs.stringify(data),
				"state": state64,
			});
		}
	}
};
/**
 * @private
 * @param {string} libnm
 * @return {*}
 */
GrantAuth.prototype.loadLib = function(libnm){
	if(!this.lib[libnm]){
		this.lib[libnm] = require(libnm);
	}
	return this.lib[libnm];
};
/**
 * @private
 * @param {string} url
 * @return {string}
 */
GrantAuth.prototype.getBaseUrl = function(url){
	/** @type {URL} */
	var opts = this.loadLib("url").parse(url);
	/** @type {string} */
	var ret = opts["protocol"] + "//" + opts["host"];
	return ret;
};
/**
 * @private
 * @param {string} dat
 * @return {string}
 */
GrantAuth.prototype.hmac = function(dat){
	/** @const {GrantAuth} */
	const _this = this;
	/** @const {forge} */
	const forge = _this.loadLib("node-forge");
	/** @type {forge.hmac} */
	var hmac = forge.hmac.create();
	hmac.start(_this.cs.HMAC_METHOD, _this.cs.HMAC_KEY);
	hmac.update(dat);
	return forge.util.encode64(hmac.digest().getBytes());
};

module.exports = function(lib, relay){
	const obj = {};
	const consts = require("./zgaconst.sjs");

	/** @const {Object<string, string>} */
	const mimetypes = {
		"js": "application/javascript",
		"png": "image/png",
		"html": "text/html",
		"ico": "image/x-icon",
		"css": "text/css",
		"json": "application/json",
		"mp4": "video/mp4",
		"*": "application/octet-stream",
	};
	/**
	 * @param {http.ServerResponse} a_res
	 * @param {string=} a_msg
	 */
	function response404(a_res, a_msg){
		a_res.statusCode = 404;
		a_res.statusMessage = a_msg || "No such file.";
		a_res.end();
	}
	/**
	 * @param {http.IncomingMessage} a_req
	 * @param {http.ServerResponse} a_res
	 */
	function responseFile(a_req, a_res){
		/** @type {string} */
		var a_url = lib["path"].join("/", a_req.url);
		if(lib["path"].sep == lib["path"].win32.sep){
			a_url = a_url.replaceAll(lib["path"].sep, "/");
		}
		/** @type {number} */
		var a_i = a_url.indexOf("?");
		if(a_i > 0){
			a_url = a_url.substring(0, a_i);
		}
		a_i = a_url.indexOf("#");
		if(a_i > 0){
			a_url = a_url.substring(0, a_i);
		}
		a_url = a_url.slice(1);
		if(!a_url || a_url.slice(-1) == "/"){
			a_url = a_url.concat("index.html");
		}
		/** @type {string} */
		var a_fpath = lib["path"].join(__dirname, consts.STATIC_DIR.concat(a_url));
		lib["fs"].stat(a_fpath, /** function(string, fs.Stats) */function(b_err, b_stats){
			if(b_err){
				response404(a_res);
			}else if(b_stats.isFile()){
				/** @type {string} */
				var b_ext = lib["path"].extname(a_fpath);
				if(b_ext.substring(0, 1) === "."){
					b_ext = b_ext.slice(1);
				}
				/** @type {string} */
				var b_mtype = mimetypes[b_ext] || mimetypes["*"];
				a_res.setHeader("content-type", b_mtype);
				// a_res.setHeader("Access-Control-Allow-Origin", "*");
				// a_res.setHeader("Access-Control-Expose-Headers", "*");
				a_res.setHeader("accept-ranges", "bytes");
				var bst = 0;
				var bed = 0;
				if(a_req.headers["range"]){
					var ranges = a_req.headers["range"].match(/bytes *= *(\d*) *- *(\d*)/);
					if(Array.isArray(ranges)){
						bst = parseInt(ranges[1], 10);
						bed = parseInt(ranges[2], 10);
						if(isNaN(bst)){
							bst = 0;
						}
						if(isNaN(bed)){
							if(bst > 0){
								bed = b_stats.size - 1;
							}else{
								bed = 0;
							}
						}else if(bed >= b_stats.size){
							if(bst > 0){
								bed = b_stats.size - 1;
							}else{
								bed = 0;
							}
						}
					}
				}
				if(bed > bst){
				//Do resume
					bed = Math.min(bed, bst + 511999);
					a_res.setHeader("content-range", "bytes ".concat(bst).concat("-").concat(bed).concat("/").concat(b_stats.size));
					a_res.setHeader("content-length", bed - bst + 1);
					a_res.statusCode = 206;
					var strm = lib["fs"].createReadStream(a_fpath, {"start": bst, "end": bed});
					strm.pipe(a_res);

				}else{
				//Do new download
					a_res.setHeader("content-length", b_stats.size);
					lib["fs"].createReadStream(a_fpath).pipe(a_res);
				}
			}else{
				response404(a_res, "Unexpected file type.");
			}
		});
	}

	/**
	 * @param {http.IncomingMessage} a_req
	 * @param {http.ServerResponse} a_res
	 */
	obj.serve = function(a_req, a_res){
		if(a_req.method == "OPTIONS"){
			if(a_req.url == "/relay.php" || a_req.url == "/grantauth.php"){
				a_res.setHeader("Access-Control-Allow-Origin", "*");
				a_res.setHeader("Access-Control-Allow-Method", "GET, POST, OPTIONS, HEAD");
				a_res.setHeader("Access-Control-Allow-Headers", "Accept, Accept-Language, Content-Language, Content-Type, Range, Zb-Url");
				a_res.statusCode = 200;
				a_res.statusMessage = "CORS OK";
				a_res.end();
			}else{
				a_res.statusCode = 405;
				a_res.statusMessage = "Method Not Allowed.";
				a_res.end();
			}

		}else if(a_req.method == "GET"){
			if(a_req.url == "/relay.php"){
				if(relay){
					relay.relayGet(a_req, a_res);
				}else{
					a_res.statusCode = 404;
					a_res.statusMessage = "File not found.";
					a_res.end();
				}
			}else{
				responseFile(a_req, a_res);
			}
		}else if(a_req.method == "POST"){
			if(a_req.url == "/grantauth.php"){
				/** @type {GrantAuth} */
				var ga = new GrantAuth(lib, consts);
				ga.process(a_req, a_res);
			}else{
				a_res.statusCode = 404;
				a_res.statusMessage = "File not found.";
				a_res.end();
			}
		}else{
			a_res.statusCode = 405;
			a_res.statusMessage = "Method Not Allowed.";
			a_res.end();
		}
	};
	return obj;
};

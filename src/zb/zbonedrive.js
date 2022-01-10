function ZbOneDrive(){

//https://docs.microsoft.com/zh-cn/onedrive/developer/rest-api/api/driveitem_createuploadsession
// opt: {
//   (required)"upath": "/me/drive",
//   (optional)"method": "PUT",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"headers": {"Content-Type": "text/html"},
//   (optional)"data": Object,
//   (optional)"doneFunc": function(result){}, // result: {"status": 999, "restext": "xxxxx"}
//   (optional)"retry": false, // Is retry after InvalidAuthenticationToken or not.
// }
this.sendAjax = function(opt){
	var method = "POST";
	var url = "https://graph.microsoft.com/v1.0".concat(opt.upath);
	var ajax = new XMLHttpRequest();

 	if(opt && opt.method){
		method = opt.method;
	}
	ajax.open(method, url, true); //非同期
	if(opt && opt.auth){
		ajax.setRequestHeader("Authorization", opt.auth);
	}else if(opt && opt.utoken){
		var utype = "Bearer";
		if(opt && opt.utype){
			utype = opt.utype;
		}
		ajax.setRequestHeader("Authorization", utype+" "+opt.utoken);
	}
	if(opt && opt.headers){
		for(var key in opt.headers){
			ajax.setRequestHeader(key, opt.headers[key]);
		}
	}
	if(opt && opt.doneFunc){
		ajax.onload = function(a_evt){
			var a_x = a_evt.target;
			if (a_x.readyState == 4){
				if(a_x.status == 401 && g_storage && g_storage["refresh_token"] && !opt.retry){
					this.retryAjaxWithLogin(opt);
				}else{
					opt.doneFunc({
						"status": a_x.status, 
						"restext": a_x.responseText,
					});
				}
			}
		}.bind(this);
	}
	ajax.send(opt.data);
};

this.login = function(reuseToken){
	if(g_storage && reuseToken){
		g_accessToken = sessionStorage.getItem("access_token");
		if(g_accessToken){
			return true;
		}
	}

	var canSkipLogin = false;
	var opt = new Object();
	var uparams  = getQueryParameters();
	if(g_storage && g_storage["skipLogin"]){
		canSkipLogin = true;
	}
	if(uparams && uparams["token_type"] && uparams["access_token"]){
		this.setAccessToken(uparams["token_type"], uparams["access_token"]);
		return true;
	}else if(uparams && uparams["code"]){
		opt["code"] = uparams["code"];
	}else if(canSkipLogin && g_storage["refresh_token"]){
		opt["refreshToken"] = g_storage["refresh_token"];
	}

	if(opt["code"] || opt["refreshToken"]){
		if(g_storage && uparams && uparams["state"]){
			if(uparams["state"] == sessionStorage.getItem("login_state")){
				sessionStorage.removeItem("login_state");
			}else{
				showError("Unauthorized access to this url.");
				return false;
			}
		}
		var ret = this.authorize(opt);
		if(ret && ret["token_type"] && ret["access_token"]){
			this.setAccessToken(ret["token_type"], ret["access_token"]);
			if(canSkipLogin && opt["code"] && ret["refresh_token"]){
				g_storage["refresh_token"] = ret["refresh_token"];
				g_saveStorage = true;
			}
			return true;
		}else if(ret && ret["error"]){
			showError("["+ret["error"]+"] "+ret["error_description"]);
			return false;
		}else{
			showError("Unknown error occured when doing authorization.");
			return false;
		}
	}else{
		if(canSkipLogin){
			opt["needCode"] = true;
		}
		var ret = this.authorize(opt);
		if(ret && ret["url"]){
			if(g_storage && ret["state"]){
				sessionStorage.setItem("login_state", ret["state"]);
			}
			window.location.href = ret["url"];
		}else if(ret && ret["error"]){
			showError("["+ret["error"]+"] "+ret["error_description"]);
			return false;
		}else{
			showError("Unknown error occured when doing authorization.");
			return false;
		}
	}
	return false;
};

// opt: {
//   (optional)"upath": "aaa/bbb",  //"upath" or "uid" must be specified.
//   (optional)"uid": "xxxxxx",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error, children){},
// }
this.getItem = function(opt){
	var opt2 = {
		"method": "GET",
		"doneFunc": function(a_res){
			var a_dat = null;
			var a_err = false;
			if(a_res["status"] == 200){
				a_dat = this.makeReturnItem(JSON.parse(a_res["restext"]));
			}else{
				a_err = a_res;
			}
			if(opt && opt["doneFunc"]){
				opt["doneFunc"](a_err, a_dat);
			}else if(a_err){
				alert(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	if(opt && opt["upath"]){
		opt2["upath"] = "/me/drive/root:/"+opt["upath"];
	}else if(opt && opt["uid"]){
		opt2["upath"] = "/me/drive/items/"+opt["uid"];
	}else{
		throw new Error("No path nor id is specified.");
	}
	["utype", "utoken", "auth"].forEach(function(a_ele){
		if(opt[a_ele]){
			opt2[a_ele] = opt[a_ele];
		}
	});
	this.sendAjax(opt2);
};

// opt: {
//   (optional)"ufolder": "aaa/bbb",  //If "ufolder" and "uid" are both omitted then root will be listed.
//   (optional)"uid": "xxxxxx",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error, children){},
// }
this.listFolder = function(opt){
	var opt2 = {
		"upath": "/me/drive/root/children",
		"method": "GET",
		"doneFunc": function(a_res){
			var a_arr = null;
			var a_err = false;
			if(a_res["status"] == 200){
				var a_dat = JSON.parse(a_res["restext"]);
				a_arr = new Array();
				a_dat["value"].forEach(function(b_ele, b_idx){
					var b_itm = this.makeReturnItem(b_ele);
					a_arr.push(b_itm);
				}, this);
			}else{
				a_err = a_res;
			}
			if(opt && opt["doneFunc"]){
				opt["doneFunc"](a_err, a_arr);
			}else if(a_err){
				alert(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	if(opt){
		if(opt["ufolder"]){
			opt2["upath"] = "/me/drive/root:/"+opt["ufolder"]+":/children";
		}else if(opt["uid"]){
			opt2["upath"] = "/me/drive/items/"+opt["uid"]+"/children";
		}
		["utype", "utoken", "auth"].forEach(function(a_ele){
			if(opt[a_ele]){
				opt2[a_ele] = opt[a_ele];
			}
		});
	}
	this.sendAjax(opt2);
};

// opt: {
//   (required)"folder": "zzzz",
//   (optional)"parentfolder": "aaa/bbb",  //If "parentfolder" and "parentid" are both omitted then root will be the parent folder.
//   (optional)"parentid": "xxxxxx",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error, folder){},
// }
this.newFolder = function(opt){
	if(!(opt && opt["folder"])){
		throw new Error("Name of new folder is not specified.");
	}

	var opt2 = {
		"headers": {"Content-Type": "application/json;charset=UTF-8"},
		"upath": "/me/drive/root/children",
		"method": "POST",
		"doneFunc": function(a_res){
			var a_dat = null;
			var a_err = false;
			if(a_res["status"] == 201){
				a_dat = this.makeReturnItem(JSON.parse(a_res["restext"]));
			}else{
				a_err = a_res;
			}
			if(opt && opt["doneFunc"]){
				opt["doneFunc"](a_err, a_dat);
			}else if(a_err){
				throw new Error(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	if(opt["parentfolder"]){
		opt2["upath"] = "/me/drive/root:/"+opt["parentfolder"]+":/children";
	}else if(opt["parentid"]){
		opt2["upath"] = "/me/drive/items/"+opt["parentid"]+"/children";
	}
	["utype", "utoken", "auth"].forEach(function(a_ele){
		if(opt[a_ele]){
			opt2[a_ele] = opt[a_ele];
		}
	});

	opt2["data"] = JSON.stringify({
		"name": opt["folder"],
		"folder": new Object(),
		"@microsoft.graph.conflictBehavior": "fail",
	});

	this.sendAjax(opt2);
};

// opt: {
//   (required)"fid": "zzzz",
//   (required)"newname": "xxx.yyy",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error){},
// }
this.rename = function(opt){
	this.updateProp(opt);
};

// opt: {
//   (required)"fid": "zzzz",
//   (required)"parentid": "xxxxxx",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error){},
// }
this.move = function(opt){
	this.updateProp(opt);
};

// opt: {
//   (required)"fid": "zzzz",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error){},
// }
this.delete = function(opt){
	if(!(opt && opt["fid"])){
		throw new Error("fid is not specified.");
	}

	var opt2 = {
		"upath": "/me/drive/items/".concat(opt["fid"]),
		"method": "DELETE",
		"doneFunc": function(a_res){
			var a_err = false;
			if(a_res["status"] != 204){
				a_err = a_res;
			}
			if(opt && opt["doneFunc"]){
				opt["doneFunc"](a_err);
			}else if(a_err){
				throw new Error(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	["utype", "utoken", "auth"].forEach(function(a_ele){
		if(opt[a_ele]){
			opt2[a_ele] = opt[a_ele];
		}
	});
	this.sendAjax(opt2);
};

this.createWriter = function(opt){
	return new OneDriveWriter(opt);
};

this.createReader = function(opt){
	return new OneDriveReader(opt);
};

// --- Private methods Start --- //

this.retryAjaxWithLogin = function(_opt){
	console.log("Retry to send ajax.");
	var opt = _opt;
	if(opt){
		opt.retry = true;
	}else{
		opt = {retry: true};
	}
	this.login();
	opt.auth = g_accessToken;
	this.sendAjax(opt);
};

this.makeReturnItem = function(ele){
	var itm = {
		"id": ele["id"],
		"name": ele["name"],
		"size": ele["size"],
		"lastModifiedDateTime": ele["lastModifiedDateTime"],
	};
	if(ele["folder"]){
		itm["type"] = "1";
	}else if(ele["file"]){
		itm["type"] = "2";
	}else{
		itm["type"] = "0";
	}
	return itm;
};

this.setAccessToken = function(type, token){
	g_accessToken = type + " " + token;
	if(g_storage){
		sessionStorage.setItem("access_token", g_accessToken);
	}
};

// opt: {
//   (optional)"clientId": "xxxxx",
//   (optional)"redirectUri": "https://xxxxx",
//   (optional)"clientSecret": "xxxxx",
//   (optional)"code": "xxxxx",
//   (optional)"refreshToken": "xxxxx",
//   (optional)"needCode": true,
// }
this.authorize = function(opt){
	if(!opt){
		throw new Error("Options are not specifed when auth onedrive.");
	}

	var formData = new FormData();
	formData.append("drive_type", "onedrive");
	if(opt["clientId"]){
		formData.append("client_id", opt["clientId"]);
	}
	if(opt["redirectUri"]){
		formData.append("redirect_uri", opt["redirectUri"]);
	}
	if(opt["clientSecret"]){
		formData.append("client_secret", opt["clientSecret"]);
	}
	if(opt["code"]){
		formData.append("code", opt["code"]);
	}else if(opt["refreshToken"]){
		formData.append("refresh_token", opt["refreshToken"]);
	}else{
		if(opt["needCode"]){
			formData.append("need_code", opt["needCode"]);
		}
//		throw new Error("Code or refresh token must be specifed when auth onedrive.");
	}

	var ret = null;
	var ajax = new XMLHttpRequest();
	ajax.open("POST", g_AUTHURL, false); //同期
	ajax.withCredentials = true;
	ajax.send(formData);
	if(ajax.readyState == 4){
		if(ajax.status == 200){
			ret =JSON.parse(ajax.responseText);
		}else{
			throw new Error(ajax.responseText+" ("+ajax.status+")");
		}
	}
	return ret;
};

// opt: {
//   (required)"fid": "zzzz",
//   (optional)"newname": "xxx.yyy",
//   (optional)"parentid": "xxxxxx",
//   (optional)"utype": "Bearer",
//   (optional)"utoken": "xxxxxxxx",
//   (optional)"auth": "xxxxxxxx",    //If "auth" is specified then "utype" and "utoken" will be ignored.
//   (optional)"doneFunc": function(error){},
// }
this.updateProp = function(opt){
	if(!(opt && opt["fid"])){
		throw new Error("fid is not specified.");
	}

	var opt2 = {
		"headers": {"Content-Type": "application/json;charset=UTF-8"},
		"upath": "/me/drive/items/".concat(opt["fid"]),
		"method": "PATCH",
		"doneFunc": function(a_res){
			var a_err = false;
			if(a_res["status"] != 200){
				a_err = a_res;
			}
			if(opt && opt["doneFunc"]){
				opt["doneFunc"](a_err);
			}else if(a_err){
				throw new Error(JSON.stringify(a_err));
			}
		}.bind(this),
	};
	["utype", "utoken", "auth"].forEach(function(a_ele){
		if(opt[a_ele]){
			opt2[a_ele] = opt[a_ele];
		}
	});

	var data = new Object();
	if(opt["newname"]){
		data["name"] = opt["newname"];
	}
	if(opt["parentid"]){
		data["parentReference"] = { "id": opt["parentid"] };
	}
	opt2["data"] = JSON.stringify(data);
	if(opt2["data"] == "{}"){
		throw new Error("No property to be updated.");
	}
	this.sendAjax(opt2);
};

// --- Private methods End --- //

}

// --- Class definitions --- //

// _opt = {
//   "auth": "xxxxxxxxx",   // required
//   "fldr": "a/b",         // optional
//   "fldrId": "xxxxxx",    // optional
//   "fnm": "aaa.txt",      // required
// }
function OneDriveWriter(_opt){
	this.drive = new ZbOneDrive();
	this.opt = _opt;
	this.upUrl = null;
	this.upSize = 0;
	this.pos = 0;

	if(!(this.opt && this.opt.fnm)){
		throw new Error("fnm is not specified.");
	}

	// --- Public methods Start --- //
	this.prepare = function(fsize, cb){
		this.upSize = fsize;

		var uopt = {
			"upath": "/me/drive/root:/",
			"method": "POST",
			"auth": this.opt.auth,
			"headers": {
				"Content-Type": "application/json;charset=UTF-8",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
			},
			"doneFunc": function(a_res){
				if(a_res["status"] >= 200 && a_res["status"] <= 299){
					var a_retdat = JSON.parse(a_res["restext"]);
					this.upUrl = a_retdat["uploadUrl"];
					if(cb){
						cb(a_res);
					}
				}else{
					showError(JSON.stringify(a_res));
				}
			}.bind(this),
		};
		if(this.opt.fldrId){
			uopt["upath"] = "/me/drive/items/"+encodeURIComponent(this.opt.fldrId)+":/";
 		}else if(this.opt.fldr){
			uopt["upath"] += encodeURIComponent(this.opt.fldr) + "/";
		}
		uopt["upath"] += encodeURIComponent(this.opt.fnm);
		uopt["upath"] += ":/createUploadSession";
		uopt["data"] = JSON.stringify({
			"item": {
				"@microsoft.graph.conflictBehavior": "replace",
				"fileSize": this.upSize,
				"name": this.opt.fnm,
			}
		});

		this.drive.sendAjax(uopt);
	};

	//buf: byte array
	this.write = function(buf, cb){
		var bufblob = new Blob([new Uint8Array(buf)], { "type" : "application/octet-binary" });
		var ajax = new XMLHttpRequest();
		var range = "bytes " + this.pos + "-";
		this.pos += bufblob.size;
		range += (this.pos - 1) + "/" + this.upSize;

		ajax.open("PUT", this.upUrl, true); //非同期
//		ajax.setRequestHeader("Content-Length", bufblob.size);
		ajax.setRequestHeader("Content-Range", range);
		ajax.onload = function(a_evt){
			var a_x = a_evt.target;
			if (a_x.readyState == 4){
				if(a_x.status >= 200 && a_x.status <= 299){
					if(cb){
						cb(a_x.responseText);
					}
				}else{
					alert(a_x.responseText+" ("+a_x.status+")");
				}
			}
		}.bind(this);
		ajax.send(bufblob);
	};
	// cb: function(a_err, a_result){} // a_result: {"status": 999, "restxt": "xxxxx"}
	this.cancel = function(cb){
		var ajax = new XMLHttpRequest();
		ajax.open("DELETE", this.upUrl, true); //非同期
		ajax.onload = function(a_evt){
			var a_x = a_evt.target;
			if (a_x.readyState == 4){
				var a_result = {"status": a_x.status, "restxt": a_x.responseText};
				if(a_x.status >= 200 && a_x.status <= 299){
					if(cb){
						cb(false, a_result);
					}
				}else{
					console.log(a_x.responseText+" ("+a_x.status+")");
					if(cb){
						cb(a_result);
					}
				}
			}
		}.bind(this);
		ajax.send();
	};
	// --- Public methods End --- //
}

// _opt = {
//   "auth": "xxxxxxxxx", // required
//   "id": "xxxxx",       // required
//   "bufSize": 999,      // optional
// }
function OneDriveReader(_opt){
	this.drive = new ZbOneDrive();
	this.opt = _opt;
	this.url = null;
	this.name = null;
	this.size = 0;
	this.pos = 0;
	this.reading = 0;
	this.oldreading = 0;
	this.prepared = false;
	// buffer size per read
	this.bufSize = 1600;
	if(_opt.bufSize){
		this.bufSize = _opt.bufSize;
	}

	// --- Public methods Start --- //
	this.onread = null; // function(ArrayBuffer, event_target){}

	this.prepare = function(offset, cb){
		if(this.prepared){
			if(this.reading){
				this.oldreading = this.reading;
				this.reading = 0;
			}
			if(offset){
				if(offset >= this.getSize()){
					console.log("offset:"+offset+",size:"+this.getSize());
					throw new Error("offset can not be bigger than input size.");
				}else{
					this.pos = offset;
				}
			}else{
				this.pos = 0;
			}
			if(cb){
				cb();
			}
			return;
		}

		this.drive.sendAjax({
			"upath": "/me/drive/items/"+this.opt.id,
			"method": "GET",
			"auth": this.opt.auth,
			"doneFunc": function(a_res){
				this.prepared = true;
				if(a_res["status"] != 200){
					throw new Error(a_res["restext"]+" ("+a_res["status"]+")");
					return;
				}
				var a_dat = JSON.parse(a_res["restext"]);
				this.size = a_dat["size"];
				if(offset){
					if(offset >= this.getSize()){
						throw new Error("offset can not be bigger than input size.");
					}else{
						this.pos = offset;
					}
				}
				this.url = a_dat["@microsoft.graph.downloadUrl"];
				this.name = a_dat["name"];
				if(cb){
					cb();
				}
			}.bind(this),
		});
	};
	this.getName = function(){
		return this.name;
	};
	this.getPos = function(){
		return this.pos;
	};
	this.getSize = function(){
		return this.size;
	};
	this.isEnd = function(){
		return this.pos >= this.getSize();
	};
	this.read = function(size){
		if(!size){
			size = this.bufSize;
		}
		this._read(size);
	};
	// --- Public methods End --- //

	// --- Private methods Start --- //
	this._read = function(size){
		if(size && this.reading){
			return;
		}else if(size){
			this.reading = size;
		}else if(this.reading){
			size = this.reading;
		}else{
			throw new Error("size must be specified.");
		}
		if(this.oldreading){
			return;
		}
		var pos1 = this.pos + size - 1;
		var ajax = new XMLHttpRequest();
		ajax.open("GET", this.url, true);
		ajax.setRequestHeader("Range", "bytes="+this.pos+"-"+pos1);
		ajax.responseType = "arraybuffer";
		ajax.onload = function(a_evt){
			if(this.oldreading){
				this.oldreading = 0;
				if(this.reading){
					this._read();
				}
				return;
			}
			this.reading = 0;
			var a_x = a_evt.target;
			if (a_x.readyState == 4){
				if(a_x.status == 200 || a_x.status == 206){
					var a_l = parseInt(a_x.getResponseHeader("content-length"));
					if(a_l){
						this.pos += a_l;
					}else{
						var a_r = analyzeRangePos(a_x.getResponseHeader("content-range"));
						if(a_r){
							this.pos = a_r + 1;
						}else{
							this.pos = pos1 + 1;
						}
					}
					if(a_x.status == 200 && this.pos < this.getSize()){
						this.pos = this.getSize();
					}else if(this.pos > this.getSize()){
						this.pos = this.getSize();
					}
					if(this.onread){
						this.onread(a_x.response, this);
					}
				}else{
					throw new Error(a_x.responseText+" ("+a_x.status+")");
				}
			}
		}.bind(this);
		ajax.send();
	};
}

function analyzeRangePos(crng){
	if(!crng){
		return 0;
	}
	var i = crng.indexOf("-");
	if(i < 0){
		return 0;
	}else{
		i++;
	}
	var j = crng.indexOf("/", i);
	if(j <= i){
		return 0;
	}else{
		return parseInt(crng.slice(i, j));
	}
}

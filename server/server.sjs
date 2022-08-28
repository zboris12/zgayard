/** @const {Object<string, *>} */
const lib = {
	"http:": require("http"),
	"https:": require("https"),
	"url": require("url"),
	"path": require("path"),
	"fs": require("fs"),
};
/** @const {Object<string, string>} */
const mimetypes = {
	"js": "application/javascript",
	"png": "image/png",
	"html": "text/html",
	"ico": "image/x-icon",
	"css": "text/css",
	"json": "application/json",
	"*": "application/octet-stream",
};
/** @const {number} */
const port = 10801;

/**
 * @param {http.IncomingMessage} a_req
 * @param {http.ServerResponse} a_res
 */
function relayData(a_req, a_res){
	/** @type {string} */
	var a_url = a_req.headers["zb-url"];
	if(a_url){
		delete a_req.headers["zb-url"];
		/** @type {URL} */
		var a_opts = lib["url"].parse(a_url);
		a_opts["headers"] = a_req.headers;
		// fix host
		a_opts["headers"]["host"] = a_opts["host"];
//a_res.setHeader("Access-Control-Allow-Origin", "*");

		// do get
		lib[a_opts["protocol"]].get(a_opts, function(b_hres){
			a_res.writeHead(b_hres.statusCode, b_hres.statusMessage, b_hres.headers);
			b_hres.on("data", function(c_chunk){
				a_res.write(c_chunk);
			});
			b_hres.on("end", function(){
				a_res.end();
			});
		});
	}else{
		a_res.statusCode = 500;
		a_res.statusMessage = "Bad Request.";
		a_res.end();
	}
}
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
	var a_url = a_req.url;
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
	var a_fpath = lib["path"].join(__dirname, "../".concat(a_url));
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
			a_res.setHeader("content-length", b_stats.size);
			lib["fs"].createReadStream(a_fpath).pipe(a_res);
		}else{
			response404(a_res, "Unexpected file type.");
		}
	});
}
/** @type {http.requestListener} */
var listenerHttp = lib["http:"].createServer(/** function(http.IncomingMessage, http.ServerResponse) */ function(a_req, a_res){
	if(a_req.method == "OPTIONS"){
		a_res.setHeader("Access-Control-Allow-Origin", "*");
		a_res.setHeader("Access-Control-Allow-Method", "GET, OPTIONS, HEAD");
		a_res.setHeader("Access-Control-Allow-Headers", "Accept, Accept-Language, Content-Language, Content-Type, Range, Zb-Url");
		a_res.statusCode = 200;
		a_res.statusMessage = "CORS OK";
		a_res.end();

	}else if(a_req.method == "GET"){
		if(a_req.url == "/relay.php"){
			relayData(a_req, a_res);
		}else{
			responseFile(a_req, a_res);
		}
	}else{
		a_res.statusCode = 405;
		a_res.statusMessage = "Method Not Allowed.";
		a_res.end();
	}
}).listen(port);
console.log("listening http on *:".concat(port));

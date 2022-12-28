/** @const {number} */
const port = 10801;
/** @const {Object<string, *>} */
const lib = {
	"http:": require("http"),
	"https:": require("https"),
	"url": require("url"),
	"path": require("path"),
	"fs": require("fs"),
};
const zga = require("./zgayard.sjs")(lib);
/** @type {http.requestListener} */
var listenerHttp = lib["http:"].createServer(zga.serve).listen(port);
console.log("listening http on *:".concat(port));

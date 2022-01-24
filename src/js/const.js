/** @const {string} */
const g_AUTHURL = "https://zgayard.f5.si/grantauth.php";
/** @const {string} */
const g_RELAYURL = "https://zgayard.f5.si/relay.php";
/** @const {Object<string, string>} */
const g_LANGUAGES = {
	"en": "English",
	"ja": "日本語",
};
/** @const {string} */
const g_CONFILE = "_zgayard_.conf";
/** @const {string} */
const g_HASHKEY = "zgayard";

/** @type {Object<string, DriveDefine>} */
var g_DRIVES = new Object();
ZbOneDrive.addDefine(g_DRIVES);


/** @const {Object<string, string>} */
const g_imagetypes = {
	"bmp": "image/bmp",
	"gif": "image/gif",
	"jpe": "image/jpeg",
	"jpeg": "image/jpeg",
	"jpg": "image/jpeg",
	"png": "image/png",
};
/** @const {Object<string, string>} */
const g_audiotypes = {
	"aac": "audio/aac",
	"mp3": "audio/mpeg",
	"wav": "audio/wav",
};
/** @const {Object<string, string>} */
const g_videotypes = {
	"avi": "video/x-msvideo",
	"mp4": "video/mp4",
	"mpeg": "video/mpeg",
};

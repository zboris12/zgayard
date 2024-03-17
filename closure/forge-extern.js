/** @const */
var forge = {};

forge.random = {};
/**
 * @param {number} count
 * @return {string}
 */
forge.random.getBytesSync = function(count){};

forge.util = {};
/**
 * @constructor
 * @param {string|ArrayBuffer=} b
 */
forge.util.ByteBuffer = function(b){};
/**
 * @param {number=} count
 * @return {string}
 */
forge.util.ByteBuffer.prototype.getBytes = function(count){};
/**
 * @return {number}
 */
forge.util.ByteBuffer.prototype.length = function(){};
/**
 * @param {string} value
 * @return {forge.util.ByteBuffer}
 */
forge.util.ByteBuffer.prototype.putBytes = function(value){};
/**
 * @param {number} count
 * @return {forge.util.ByteBuffer}
 */
forge.util.ByteBuffer.prototype.truncate = function(count){};

/**
 * @param {string} input
 * @return {string}
 */
forge.util.decode64 = function(input){};
/**
 * @param {string} input
 * @param {number=} maxline
 * @return {string}
 */
forge.util.encode64 = function(input, maxline){};
/**
 * @param {string} str
 * @return {string}
 */
forge.util.decodeUtf8 = function(str){};
/**
 * @param {string} str
 * @return {string}
 */
forge.util.encodeUtf8 = function(str){};

forge.util.binary = {};
forge.util.binary.base64 = {};
/**
 * @param {string} input
 * @return {Uint8Array}
 */
forge.util.binary.base64.decode = function(input){};

forge.util.text = {};
forge.util.text.utf8 = {};
/**
 * @param {string} str
 * @return {Uint8Array}
 */
forge.util.text.utf8.encode = function(str){};

forge.md = {};
/** @constructor */
forge.md.digest = function(){};
/**
 * @return {forge.util.ByteBuffer}
 */
forge.md.digest.prototype.digest = function(){};
/**
 * @param {string=} md
 * @param {string=} key
 * @return {forge.md.digest}
 */
forge.md.digest.prototype.start = function(md, key){};
/**
 * @param {string=} msg
 * @param {string=} encoding
 * @return {forge.md.digest}
 */
forge.md.digest.prototype.update = function(msg, encoding){};

forge.md.md5 = {};
/**
 * @return {forge.md.digest}
 */
forge.md.md5.create = function(){};

forge.hmac = {};
/**
 * @return {forge.md.digest}
 */
forge.hmac.create = function(){};

forge.cipher = {};
/** @constructor */
forge.cipher.BlockCipher = function(){};
/**
 * @typedef
 * {{
 *    iv: (string|undefined),
 *    additionalData: (string|undefined),
 *    tagLength: (number|undefined),
 *    tag: (string|undefined),
 *    output: (forge.util.ByteBuffer|undefined),
 * }}
 */
var CipherOptions;
/**
 * @param {CipherOptions} options
 */
forge.cipher.BlockCipher.prototype.start = function(options){};
/**
 * @param {forge.util.ByteBuffer} input
 */
forge.cipher.BlockCipher.prototype.update = function(input){};
/**
 * @return {boolean}
 */
forge.cipher.BlockCipher.prototype.finish = function(){};
/** @type {forge.util.ByteBuffer} */
forge.cipher.BlockCipher.prototype.output;
/**
 * @param {string} algorithm
 * @param {forge.util.ByteBuffer} key
 * @return {forge.cipher.BlockCipher}
 */
forge.cipher.createCipher = function(algorithm, key) {};
/**
 * @param {string} algorithm
 * @param {forge.util.ByteBuffer} key
 * @return {forge.cipher.BlockCipher}
 */
forge.cipher.createDecipher = function(algorithm, key) {};

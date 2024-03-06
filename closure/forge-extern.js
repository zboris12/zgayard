/** @const */
var forge = {};

forge.random = {};
/**
 * @param {number} count
 * @return {string}
 */
forge.random.getBytesSync = function(count){};

forge.util = {};
/** @constructor */
forge.util.ByteStringBuffer = function(){};
/**
 * @param {number=} count
 * @return {string}
 */
forge.util.ByteStringBuffer.prototype.getBytes = function(count){};
/**
 * @return {number}
 */
forge.util.ByteStringBuffer.prototype.length = function(){};
/**
 * @param {string} value
 * @return {forge.util.ByteStringBuffer}
 */
forge.util.ByteStringBuffer.prototype.putBytes = function(value){};
/**
 * @param {number} count
 * @return {forge.util.ByteStringBuffer}
 */
forge.util.ByteStringBuffer.prototype.truncate = function(count){};

/**
 * @param {string} input
 * @param {string=} encoding
 * @return {forge.util.ByteStringBuffer}
 */
forge.util.createBuffer = function(input, encoding){};
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
 * @return {forge.util.ByteStringBuffer}
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
 *    output: (forge.util.ByteStringBuffer|undefined),
 * }}
 */
var CipherOptions;
/**
 * @param {CipherOptions} options
 */
forge.cipher.BlockCipher.prototype.start = function(options){};
/**
 * @param {forge.util.ByteStringBuffer} input
 */
forge.cipher.BlockCipher.prototype.update = function(input){};
/**
 * @return {boolean}
 */
forge.cipher.BlockCipher.prototype.finish = function(){};
/** @type {forge.util.ByteStringBuffer} */
forge.cipher.BlockCipher.prototype.output;
/**
 * @param {string} algorithm
 * @param {forge.util.ByteStringBuffer} key
 * @return {forge.cipher.BlockCipher}
 */
forge.cipher.createCipher = function(algorithm, key) {};
/**
 * @param {string} algorithm
 * @param {forge.util.ByteStringBuffer} key
 * @return {forge.cipher.BlockCipher}
 */
forge.cipher.createDecipher = function(algorithm, key) {};

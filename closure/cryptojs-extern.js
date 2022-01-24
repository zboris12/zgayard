/**
 * @fileoverview This is an externs file.
 * @externs
 */
var CryptoJS = {
  /** Cipher */"AES": {},
  "EvpKDF": function () {},
  "HmacMD5": function () {},
  "HmacRIPEMD160": function () {},
  "HmacSHA1": function () {},
  "HmacSHA224": function () {},
  "HmacSHA256": function () {},
  "HmacSHA3": function () {},
  "HmacSHA384": function () {},
  "HmacSHA512": function () {},
  "MD5": function () {},
  "PBKDF2": function () {},
  "algo": {
    /** Cipher */"AES": {},
    /** Hasher */"HMAC": {},
    /** Hasher */"MD5": {},
    /** Cipher */"PBKDF2": {},
    /** Cipher */"RC4": {},
    /** Cipher */"RC4Drop": {},
    /** Cipher */"RIPEMD160": {},
    /** Cipher */"Rabbit": {},
    /** Cipher */"RabbitLegacy": {},
    /** Hasher */"SHA1": {},
    /** Hasher */"SHA224": {},
    /** Hasher */"SHA256": {},
    /** Hasher */"SHA3": {},
    /** Hasher */"SHA384": {},
    /** Hasher */"SHA512": {},
    /** Cipher */"TripleDES": {},
  },
  "enc": {
    "Base64": {
      "_map": {},
      "parse": function () {},
      "stringify": function () {}
    },
    "Base64url": {
      "_map": {},
      "_safe_map": {},
      "parse": function () {},
      "stringify": function () {}
    },
    "Hex": {
      "parse": function () {},
      "stringify": function () {}
    },
    "Latin1": {
      "parse": function () {},
      "stringify": function () {}
    },
    "Utf16": {
      "parse": function () {},
      "stringify": function () {}
    },
    "Utf16BE": {
      "parse": function () {},
      "stringify": function () {}
    },
    "Utf16LE": {
      "parse": function () {},
      "stringify": function () {}
    },
    "Utf8": {
      "parse": function () {},
      "stringify": function () {}
    }
  },
  "format": {
    "Hex": {
      "parse": function () {},
      "stringify": function () {}
    },
    "OpenSSL": {
      "parse": function () {},
      "stringify": function () {}
    }
  },
  "kdf": {
    "OpenSSL": {
      "execute": function () {}
    }
  },
  "lib": {
    /** CipherParams */"Base": {},
    /** WordArray */"WordArray": {},
  },
  "mode": {
    "CBC": {}
  },
  "pad": {
    "AnsiX923": {
      "pad": function () {},
      "unpad": function () {}
    },
    "Iso10126": {
      "pad": function () {},
      "unpad": function () {}
    },
    "Iso97971": {
      "pad": function () {},
      "unpad": function () {}
    },
    "NoPadding": {
      "pad": function () {},
      "unpad": function () {}
    },
    "Pkcs7": {
      "pad": function () {},
      "unpad": function () {}
    },
    "ZeroPadding": {
      "pad": function () {},
      "unpad": function () {}
    }
  },
};

/** @interface */
var Mode = function(){};

/** @interface */
var Padding = function(){};

/** @interface */
var Format = function(){};

/** @interface */
var Cipher = function(){};
/** @public @type {function()} */
Cipher.prototype.cfg;
/** @public @type {function()} */
Cipher.prototype.clone;
/** @public @type {function()} */
Cipher.prototype.create;
/** @public @type {function()} */
Cipher.prototype.createDecryptor;
/** @public @type {function()} */
Cipher.prototype.createEncryptor;
/** @public @type {function()} */
Cipher.prototype.extend;
/** @public @type {function()} */
Cipher.prototype.finalize;
/** @public @type {function()} */
Cipher.prototype.init;
/** @public @type {function()} */
Cipher.prototype.ivSize;
/** @public @type {function()} */
Cipher.prototype.keySize;
/** @public @type {function()} */
Cipher.prototype.mixIn;
/** @public @type {function()} */
Cipher.prototype.process;
/** @public @type {function()} */
Cipher.prototype.reset;

/** @interface */
var CipherParams = function(){};
/** @public @type {function()} */
CipherParams.prototype.clone;
/** @public @type {function()} */
CipherParams.prototype.create;
/** @public @type {function()} */
CipherParams.prototype.extend;
/** @public @type {function()} */
CipherParams.prototype.init;
/** @public @type {function()} */
CipherParams.prototype.mixIn;
/** @public @type {function():string} */
CipherParams.prototype.toString;
/** @public @type {WordArray} */
CipherParams.prototype.ciphertext;
/** @public @type {WordArray} */
CipherParams.prototype.key;
/** @public @type {WordArray} */
CipherParams.prototype.iv;
/** @public @type {WordArray} */
CipherParams.prototype.salt;
/** @public @type {Cipher} */
CipherParams.prototype.algorithm;
/** @public @type {Mode} */
CipherParams.prototype.mode;
/** @public @type {Padding} */
CipherParams.prototype.padding;
/** @public @type {number} */
CipherParams.prototype.blockSize;
/** @public @type {Format} */
CipherParams.prototype.formatter;

/** @interface */
var Hasher = function(){};
/** @public @type {number} */
Hasher.prototype.blockSize;
/** @public @type {CipherParams} */
Hasher.prototype.cfg;
/** @public @type {function()} */
Hasher.prototype.clone;
/** @public @type {function()} */
Hasher.prototype.create;
/** @public @type {function()} */
Hasher.prototype.extend;
/** @public @type {function()} */
Hasher.prototype.finalize;
/** @public @type {function()} */
Hasher.prototype.init;
/** @public @type {function()} */
Hasher.prototype.mixIn;
/** @public @type {function()} */
Hasher.prototype.reset;
/** @public @type {function(WordArray)} */
Hasher.prototype.update;

/** @interface */
var WordArray = function(){};
/** @public @type {function()} */
WordArray.prototype.clamp;
/** @public @type {function()} */
WordArray.prototype.clone;
/** @public @type {function(WordArray)} */
WordArray.prototype.concat;
/** @public @type {function()} */
WordArray.prototype.create;
/** @public @type {function()} */
WordArray.prototype.extend;
/** @public @type {function()} */
WordArray.prototype.init;
/** @public @type {function()} */
WordArray.prototype.mixIn;
/** @public @type {function()} */
WordArray.prototype.random;
/** @public @type {function(Object):string} */
WordArray.prototype.toString;
/** @public @type {number} */
WordArray.prototype.sigBytes;
/** @public @type {Array<number>} */
WordArray.prototype.words;

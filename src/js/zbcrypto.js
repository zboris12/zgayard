/**
 * Create the crypt config
 *
 * @param {string|WordArray} _pwd
 * @param {string|WordArray=} _salt
 * @return {CipherParams}
 */
function zbCreateCfg(_pwd, _salt){
	/** @type {string|WordArray|null} */
	var salt = null;
	if(_salt){
		salt = _salt;
	}else{
		salt = CryptoJS.MD5(_pwd);
	}
	/** @type {CipherParams} */
	var ret = CryptoJS.kdf.OpenSSL.execute(_pwd, 256/32, 128/32, salt);
	ret["iv"].clamp();
	ret["key"].clamp();
	return ret;
}
/**
 * Create the crypt config
 *
 * @param {boolean} _encFlg
 * @param {string|WordArray} _dat
 * @param {string|CipherParams} _cfg
 * @return {WordArray}
 *
 * _cfg can be: {
 *   (required)"iv": derivedParams.iv,
 *   (required)"key": derivedParams.key,
 *   (optional)"mode": CryptoJS.mode.CBC,
 *   (optional)"padding": CryptoJS.pad.Pkcs7,
 * };
 */
function zbDataCrypto(_encFlg, _dat, _cfg){
	/** @type {string|CipherParams} */
	var cfg = _cfg;
	if(typeof _cfg == "string"){
		cfg = zbCreateCfg(_cfg);
	}
	if(!(cfg && cfg["iv"] && cfg["key"])){
		throw new Error("Need iv and key. They can be generated by CryptoJS.kdf.OpenSSL.execute from password and salt.");
	}
	/** @type {!Object} */
	var cfg2 = {
		"mode": CryptoJS.mode.CBC,
		"padding": CryptoJS.pad.Pkcs7,
	};
	Object.assign(cfg2, /** @type {Object} */(cfg));

	/** @type {Cipher} */
	var cryptor = null;
	if(_encFlg){
		cryptor = CryptoJS.algo.AES.createEncryptor(cfg2.key, cfg2);
	}else{
		cryptor = CryptoJS.algo.AES.createDecryptor(cfg2.key, cfg2);
	}
	/** @type {WordArray} */
	var ret = cryptor.process(_dat);
	ret.concat(cryptor.finalize());
	ret.clamp();
	return ret;
}
/**
 * @param {string} _str
 * @param {string|CipherParams} _cfg
 * @return {string}
 */
function zbEncryptString(_str, _cfg){
	/** @type {WordArray} */
	var datIn = CryptoJS.enc.Utf8.parse(_str);
	/** @type {WordArray} */
	var datOut = zbDataCrypto(true, datIn, _cfg);
	return datOut.toString(CryptoJS.enc.Base64url);
}
/**
 * @param {string} _str
 * @param {string|CipherParams} _cfg
 * @return {string}
 */
function zbDecryptString(_str, _cfg){
	/** @type {WordArray} */
	var datIn = CryptoJS.enc.Base64url.parse(_str);
	/** @type {WordArray} */
	var datOut = zbDataCrypto(false, datIn, _cfg);
	return datOut.toString(CryptoJS.enc.Utf8);
}
/**
 * @param {WordArray} wdarr
 * @return {Array<number>}
 */
function wordArrayToBytes(wdarr){
	/** @type {Array<number>} */
	var bytes = new Array(wdarr.sigBytes);
	/** @type {Array<number>} */
	var words = wdarr.words;
	/** @type {number} */
	var idx = 0;
	for(var i=0; i<words.length; i++){
		/** @type {number} */
		var byt = words[i];
		for(var j=idx+wordArrayToBytes.WORD_SIZE-1; j>=idx; j--){
			if(j < bytes.length){
				bytes[j] = byt & 0xFF;
			}
			byt >>= 8;
		}
		idx += wordArrayToBytes.WORD_SIZE;
		if(idx >= bytes.length){
			break;
		}
	}
	return bytes;
}
/**
 * a word is 4 bytes
 *
 * @const {number}
 */
wordArrayToBytes.WORD_SIZE = 4;

// ------ Define Classes ------ //
/**
 * @constructor
 * @implements {ZBWriter}
 * @param {ZBWriterOption=} opt
 *
 * opt = {
 *   _downEle: HTMLLinkElement,   // optional
 * }
 */
function ZBlobWriter(opt){
	/** @private @type {number} */
	this.fsize = 0;
	/** @private @type {Array<ArrayBuffer|number>} */
	this.arrbuf = null;
	/** @private @type {HTMLLinkElement} */
	this.downEle = null;
	if(opt && opt._downEle){
		this.downEle = opt._downEle;
	}

	// --- Implement interface methods Start --- //
	/**
	 * @public
	 * @param {number} fsize
	 * @return {!Promise<void>}
	 */
	this.prepare = async function(fsize){
		this.fsize = fsize;
		if(this.downEle && this.downEle.href != "#"){
			window.URL.revokeObjectURL(this.downEle.href);
		}
	};
	/**
	 * @public
	 * @param {ArrayBuffer|Array<number>} buf
	 * @return {!Promise<void>}
	 */
	this.write = async function(buf){
		if(Array.isArray(buf)){
			if(this.arrbuf){
				this.arrbuf = this.arrbuf.concat(buf);
			}else{
				this.arrbuf = buf.concat();
			}
		}else{
			if(!this.arrbuf){
				this.arrbuf = new Array();
			}
			this.arrbuf.push(buf);
		}
		buf = null;
	};
	/**
	 * @public
	 * @return {!Promise<void>}
	 */
	this.cancel = async function(){};
	// --- Implement interface methods End --- //

	/**
	 * @public
	 * @return {Uint8Array|Array<number>}
	 */
	this.getBuffer = function(){
		if(this.arrbuf && this.arrbuf.length > 0){
			if(this.arrbuf[0] instanceof ArrayBuffer || this.arrbuf[0] instanceof Uint8Array){
				/** @type {number} */
				var sumLength = 0;
				for(var i = 0; i < this.arrbuf.length; i++){
					sumLength += this.arrbuf[i].byteLength;
				}
				/** @type {Uint8Array} */
				var whole = new Uint8Array(sumLength);
				/** @type {number} */
				var pos = 0;
				for(var i = 0; i < this.arrbuf.length; ++i){
					var dat = this.arrbuf[i];
					if(dat instanceof ArrayBuffer){
						dat = new Uint8Array(dat);
					}
					whole.set(/** @type {!ArrayBufferView} */(dat), pos);
					pos += dat.byteLength;
				}
				return whole;
			}
		}
		return this.arrbuf;
	};
	/**
	 * @public
	 * @return {!Blob}
	 */
	this.getBufferBlob = function(){
		/** @type {Uint8Array|Array<number>} */
		var buf = this.getBuffer();
		if(!(buf instanceof Uint8Array)){
			buf = new Uint8Array(buf);
		}
		return new Blob([buf], { "type" : "application/octet-binary" });
	};
	/**
	 * @public
	 * @param {string} fnm
	 */
	this.download = function(fnm){
		/** @type {!Blob} */
		var blob = this.getBufferBlob();
		downloadBlob(blob, fnm, this.downEle);
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getTotalSize = function(){
		return this.fsize;
	};
}

/**
 * @constructor
 * @implements {ZBReader}
 * @param {ZBReaderOption} _opt
 *
 * _opt = {
 *   _blob: Blob,    // required
 *   _bufSize: 999,  // optional
 * }
 */
function ZBlobReader(_opt){
	/** @private @type {Blob} */
	this.blob = null;
	if(_opt._blob){
		if(_opt._blob instanceof Blob){
			this.blob = _opt._blob;
		}else{
			throw new Error("blob is not a Blob.");
		}
	}else{
		throw new Error("blob must be specified.");
	}

	/**
	 * buffer size per read
	 *
	 * @private
	 * @type {number}
	 */
	this.bufSize = 1600;
	if(_opt._bufSize){
		this.bufSize = _opt._bufSize;
	}
	/** @private @type {number} */
	this.pos = 0;
	/** @private @type {FileReader} */
	this.reader = null;

	// --- Public methods Start --- //
	/** @public @type {null|function(ArrayBuffer, *)} */
	this.onread = null;

	// --- Implement interface methods Start --- //
	/**
	 * @public
	 * @param {number=} offset
	 * @return {!Promise<void>}
	 */
	this.prepare = async function(offset){
		if(offset){
			if(offset >= this.getSize()){
				throw new Error("offset can not be bigger than input size.");
			}else{
				this.pos = offset;
			}
		}

		this.reader = new FileReader();
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getPos = function(){
		return this.pos;
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.getSize = function(){
		return this.blob.size;
	};
	/**
	 * @public
	 * @return {boolean}
	 */
	this.isEnd = function(){
		return this.pos >= this.getSize();
	};
	/**
	 * @public
	 * @param {number=} size
	 * @return {!Promise<ArrayBuffer>}
	 */
	this.read = function(size){
		return new Promise(function(resolve, reject){
			if(this.reader.readyState == 1){
				return;
			}
			this.reader.onload = function(a_evt){
				/** @type {ArrayBuffer} */
				var a_dat = a_evt.target.result;
				resolve(a_dat);
			}.bind(this);
			/** @type {number} */
			var pos1 = this.pos;
			if(size){
				this.pos += size;
			}else{
				this.pos += this.bufSize;
			}
			this.reader.readAsArrayBuffer(this.blob.slice(pos1, this.pos));
		}.bind(this));
	};
	/**
	 * @public
	 */
	this.dispose = function(){
		this.reader = null;
		this.blob = null;
	};
	// --- Implement interface methods End --- //
}

/**
 * https://qiita.com/soebosi/items/74464d2f34d7416336eb
 *
 * @constructor
 * @extends {ZbSubReadable}
 * @param {ZbCryptoOption} _info
 * @param {Object<string, *>=} _opts
 *
 * (required)_info = {
 *   (optional)_decrypt: true,
 *   (required)_keycfg: "aaabbb", // keycfg may be an object as the config of crypto or a string as the password.
 *   (required)_reader: Reader, // reader.onread will be overwritten.
 *   (optional)_writer: Writer, // If omitted then run as stream mode.
 * };
 * (optional)_opts = {}; // options for stream.Readable
 */
function ZbCrypto(_info, _opts){
	if(!_info._writer){
		// Stream mode is created by ZbCrypto.createStream(_info, _opts).createReadStream();
		if(this.getSuperClass && this.getSuperClass().name == "Readable"){
			this.super(_opts);
			/**
			 * @private @type {number}
			 * 1: not ready, 2: not ready but need read, 3: ready
			 */
			this.streamMode = 1;
			if(_opts && _opts["objectMode"]){
				/** @private @type {boolean} */
				this.objectMode = true;
			}
		}else{
			throw new Error("writer must be specified in no stream mode.");
		}
	}

	/**
	 * block size of aes is 128 bits = 16 bytes
	 *
	 * @private @const @type {number}
	 */
	this.BLOCK_SIZE = 16;
	/** @private @const @type {number} */
	this.BLOCK_WSZ = this.BLOCK_SIZE / wordArrayToBytes.WORD_SIZE;

	/**
	 * If need next step return true, else return false.
	 * Only valid on no stream mode.
	 *
	 * @public @type {?function():boolean}
	 */
	this.onstep = null;
	/**
	 * Only valid on no stream mode.
	 *
	 * @public @type {?function(*=, boolean=)}
	 */
	this.onfinal = null;

	/** @private @type {boolean} */
	this.encrypt = true;
	/** @private @type {ZBReader} */
	this.reader = null;
	/** @private @type {ZBWriter|undefined} */
	this.writer = _info._writer;
	/** @private @type {WordArray} */
	this.key = null;
	/** @private @type {WordArray} */
	this.iv = null;
	/** @private @type {number} */
	this.startPos = 0;
	/** @private @type {Cipher} */
	this.cryptor = null;
	/** @private @type {number} */
	this.basetime = 0;
	/** @private @type {number} */
	this.basepos = 0;
	/**
	 * Size per second.
	 *
	 * @private @type {number}
	 */
	this.speed = 0;

	if(_info._decrypt){
		this.encrypt = false;
	}
	if(_info._reader){
		if(typeof _info._reader == "function"){
			this.reader = _info._reader();
		}else{
			this.reader = _info._reader;
		}
	}else{
		throw new Error("reader must be specified.");
	}

	if(_info._keycfg){
		/** @type {CipherParams} */
		var derivedParams = null;
		if(typeof _info._keycfg == "string"){
			derivedParams = zbCreateCfg(_info._keycfg);
		}else{
			derivedParams = /** @type {CipherParams} */(_info._keycfg);
		}
		this.key = derivedParams.key;
		this.iv = derivedParams.iv;
	}else{
		throw new Error("keycfg must be specified.");
	}

	/**
	 * @public
	 * @param {number=} offset
	 * @return {!Promise<void>}
	 */
	this.start = async function(offset){
		if(offset){
			if(this.encrypt){
				throw new Error("Can NOT set offset for encryption.");
			}
			this.startPos = offset;
			offset -= (offset % this.BLOCK_SIZE) + this.BLOCK_SIZE;
			if(offset < 0){
				offset = 0;
			}
		}
		this.reader.onread = this.onread.bind(this);
		await this.reader.prepare(offset);
		/** @type {number} */
		var sizeEnc = Math.ceil((this.reader.getSize()+1)/this.BLOCK_SIZE)*this.BLOCK_SIZE;
		if(!(this.streamMode || !this.writer)){
			await this.writer.prepare(sizeEnc);
		}
		this.firstRead();
	};
	/**
	 * @public
	 * @return {number}
	 */
	this.calSpeed = function(){
		if(Date.now() > this.basetime){
			this.speed = (this.reader.getPos() - this.basepos) * 1000 / (Date.now() - this.basetime + 1000);
			this.basetime = Date.now() + 1000;
			this.basepos = this.reader.getPos();
		}
		return this.speed;
	}

	// method for ReadableStream Start //
	/**
	 * @param {number} size
	 * @override
	 */
	this._read = function(size){
		if(this.streamMode == 1){
			this.streamMode = 2;
		}else if(this.streamMode == 3){
			if(this.reader.isEnd()){
				this.push(null);
			}else{
				this.reader.read(size);
			}
		}
	};
	/**
	 * @param {Array<number>} chunk
	 * @param {string=} encoding
	 * @return {boolean}
	 * @override
	 * @suppress {deprecated}
	 */
	this.push = function(chunk, encoding){
		if(this.readable){
			if(chunk && !this.objectMode){
				this.superCall("push", new Uint8Array(chunk));
			}else{
				this.superCall("push", chunk);
			}
			return true;
		}else{
			return false;
		}
	};
	// method for ReadableStream End //

	/** @private */
	this.firstRead = function(){
		this.basetime = Date.now() + 1000; // 1 second later
		this.basepos = this.startPos;
		if(this.startPos){
			// read for decrypt
			this.reader.read(this.BLOCK_SIZE);
		}else if(this.streamMode == 1){
			this.streamMode = 3;
		}else if(this.streamMode == 2){
			this.streamMode = 3;
			this.push(new Array());
		}else{
			// start reading
			this.reader.read();
		}
	};

	/**
	 * @private
	 * @param {ArrayBuffer} arrbuf
	 * @param {*} evtgt
	 */
	this.onread = async function(arrbuf, evtgt){
		try{
			/** @type {WordArray} */
			var wdat = new CryptoJS.lib.WordArray.init(arrbuf);
			// create cryptor
			if(!this.cryptor){
				/** @type {Object<string, *>} */
				var cfg = {
					iv: this.iv,
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7
				};
				if(this.startPos){
					cfg.iv = wdat;
					wdat = null;
				}
				if(this.encrypt){
					this.cryptor = CryptoJS.algo.AES.createEncryptor(this.key, cfg);
				}else{
					this.cryptor = CryptoJS.algo.AES.createDecryptor(this.key, cfg);
				}
			}
			if(wdat){
			// process data
				/** @type {Array<number>} */
				var ret = wordArrayToBytes(this.cryptor.process(wdat));
				if(this.reader.isEnd()){
					ret = ret.concat(wordArrayToBytes(this.cryptor.finalize()));
				}

				if(this.startPos < this.reader.getPos()){
					/** @type {number} */
					var st = this.startPos - (this.reader.getPos() - arrbuf.byteLength);
					if(st > 0){
						ret = ret.slice(st);
					}
				}else{
					ret = null;
				}

				if(this.streamMode){
					this.push(ret);
				}else if(ret){
					if(this.writer){
						await this.writer.write(ret)
						if(this.reader.isEnd()){
							this.dofinal();
						}else if(this.onstep){
							if(this.onstep()){
								this.reader.read();
							}else{
								await this.writer.cancel();
								this.dofinal();
							}
						}else{
							this.reader.read();
						}
					}
				}else{
					this.reader.read();
				}
				ret = null;
			}else if(this.streamMode){
				if(this.streamMode == 2){
					this.streamMode = 3;
					this.push(new Array());
				}else{
					this.streamMode = 3;
				}
			}else{
				this.reader.read();
			}
		}catch(err){
			if(this.streamMode){
				throw err;
			}else{
				this.dofinal(err);
			}
		}
	};

	/**
	 * @private
	 * @param {?=} err
	 * @param {?=} result
	 */
	this.dofinal = function(err, result){
		if(this.reader){
			this.reader.dispose();
			this.reader = null;
		}
		if(this.onfinal){
			if(err){
				this.onfinal(err);
			}else{
				this.onfinal(false, result);
			}
		}
	};
}
/**
 * @constructor
 * @implements {VDStreamWrapper}
 * @param {ZbCryptoOption} _info
 * @param {Object<string, *>=} _opts
 */
function ZbStreamWrapper(_info, _opts){
	const Stream = /** @type {typeof stream} */(zb_require("readable-stream"));
	if(ZbCrypto["super_"] !== Stream.Readable){
		zb_inherits(ZbCrypto, Stream.Readable);
	}
	/** @type {Object<string, *>} */
	this.strmopts = { "highWaterMark": 800000, };
	Object.assign(this.strmopts, _opts);
	/** @type {ZbCryptoOption} */
	this.info = _info;
	/** @type {?ZbCrypto} */
	this.stream = null;

	/**
	 * @public
	 * @param {Object<string, number>=} opts
	 * @return {ZbCrypto}
	 *
	 * opts = {
	 *   (optional)"start": 0,
	 *   (optional)"end": 999, // not used
	 * };
	 */
	this.createReadStream = function(opts){
		this.destroyStream();
		this.stream = new ZbCrypto(this.info, this.strmopts);
		/** @type {number} */
		var i = 0;
		if(opts && opts["start"]){
			i = opts["start"];
		}
		this.stream.start(i);
		return this.stream;
	};
	/**
	 * @public
	 */
	this.destroyStream = function(){
		if(this.stream){
			this.stream.destroy();
			this.stream = null;
		}
	};
}

/**
 * @param {ZBReader} _reader
 * @param {ZBWriter} _writer
 * @param {(function():boolean)=} _stepFunc
 * @param {(function())=} _finalFunc
 * @return {!Promise<void>}
 */
async function zbPipe(_reader, _writer, _stepFunc, _finalFunc){
	/**
	 * @param {ArrayBuffer} a_buf
	 * @param {*} a_tgt
	 */
	_reader.onread = async function(a_buf, a_tgt){
		await _writer.write(a_buf);
		if(_reader.isEnd()){
			if(_finalFunc){
				_finalFunc();
			}
		}else if(_stepFunc){
			if(_stepFunc()){
				_reader.read();
			}
		}else{
			_reader.read();
		}
	};

	await _reader.prepare(0);
	await _writer.prepare(_reader.getSize());
	_reader.read();
}

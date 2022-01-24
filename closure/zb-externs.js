/**
 * @fileoverview This is an externs file.
 * @externs
 */

/**
 * @param {string} libnm
 * @return {*}
 */
function zb_require(libnm){}
/**
 * @param {*} ctor
 * @param {*} superCtor
 */
function zb_inherits(ctor, superCtor){}

/**
 * @constructor
 * @extends {stream.ReadableStream}
 */
function ZbSubReadable(){};
/** @public @type {function():*} */
ZbSubReadable.prototype.getSuperClass;
/** @public @type {function(...*):*} */
ZbSubReadable.prototype.super;
/** @public @type {function(string, ...*):*} */
ZbSubReadable.prototype.superCall;

/**
 * @constructor
 * @param {VDStreamWrapper} strm
 * @param {Element} vdo
 */
function VideoStream(strm, vdo){};

/** @interface */
function VDStreamWrapper(){
	/**
	 * @public
	 * @param {Object<string, number>=} opts
	 * @return {stream.ReadableStream}
	 */
	this.createReadStream = function(opts){}
}

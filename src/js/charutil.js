/**
 * @typedef
 * {{
 *    KANAMAP: Object<string, string>,
 *    ROMOVES: Array<string>,
 *    WIDEUA: number,
 *    WIDEUZ: number,
 *    WIDELA: number,
 *    WIDELZ: number,
 *    WIDE0: number,
 *    WIDE9: number,
 *    CODEA: number,
 *    CODE0: number,
 *    kiyoneStr: function(string):string,
 * }}
 */
var CharUtilType;
/** @type {CharUtilType} */
var zbCharUtil = {
	KANAMAP: {
		"ァ": "あ", "ィ": "い", "ゥ": "う", "ェ": "え", "ォ": "お",
		"ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お",
		"ア": "あ", "イ": "い", "ウ": "う", "エ": "え", "オ": "お",
		"カ": "か", "キ": "き", "ク": "く", "ケ": "け", "コ": "こ",
		"ガ": "か", "ギ": "き", "グ": "く", "ゲ": "け", "ゴ": "こ",
		"が": "か", "ぎ": "き", "ぐ": "く", "げ": "け", "ご": "こ",
		"サ": "さ", "シ": "し", "ス": "す", "セ": "せ", "ソ": "そ",
		"ザ": "さ", "ジ": "し", "ズ": "す", "ゼ": "せ", "ゾ": "そ",
		"ざ": "さ", "じ": "し", "ず": "す", "ぜ": "せ", "ぞ": "そ",
		"タ": "た", "チ": "ち", "ツ": "つ", "テ": "て", "ト": "と",
		"ダ": "た", "ヂ": "ち", "ヅ": "つ", "デ": "て", "ド": "と",
		"だ": "た", "ぢ": "ち", "づ": "つ", "で": "て", "ど": "と",
		"ッ": "つ", "ャ": "や", "ュ": "ゆ", "ョ": "よ",
		"っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ",
		"ナ": "な", "ニ": "に", "ヌ": "ぬ", "ネ": "ね", "ノ": "の",
		"ハ": "は", "ヒ": "ひ", "フ": "ふ", "ヘ": "へ", "ホ": "ほ",
		"バ": "は", "ビ": "ひ", "ブ": "ふ", "ベ": "へ", "ボ": "ほ",
		"パ": "は", "ピ": "ひ", "プ": "ふ", "ペ": "へ", "ポ": "ほ",
		"ば": "は", "び": "ひ", "ぶ": "ふ", "べ": "へ", "ぼ": "ほ",
		"ぱ": "は", "ぴ": "ひ", "ぷ": "ふ", "ぺ": "へ", "ぽ": "ほ",
		"マ": "ま", "ミ": "み", "ム": "む", "メ": "め", "モ": "も",
		"ヤ": "や", "ユ": "ゆ", "ヨ": "よ",
		"ラ": "ら", "リ": "り", "ル": "る", "レ": "れ", "ロ": "ろ",
		"ワ": "わ", "ヲ": "を", "ン": "ん",
		"ヴ": "う", "ヷ": "わ", "ヺ": "を",
		"ｧ": "あ", "ｨ": "い", "ｩ": "う", "ｪ": "え", "ｫ": "お",
		"ｯ": "つ", "ｬ": "や", "ｭ": "ゆ", "ｮ": "よ",
		"ｱ": "あ", "ｲ": "い", "ｳ": "う", "ｴ": "え", "ｵ": "お",
		"ｶ": "か", "ｷ": "き", "ｸ": "く", "ｹ": "け", "ｺ": "こ",
		"ｻ": "さ", "ｼ": "し", "ｽ": "す", "ｾ": "せ", "ｿ": "そ",
		"ﾀ": "た", "ﾁ": "ち", "ﾂ": "つ", "ﾃ": "て", "ﾄ": "と",
		"ﾅ": "な", "ﾆ": "に", "ﾇ": "ぬ", "ﾈ": "ね", "ﾉ": "の",
		"ﾊ": "は", "ﾋ": "ひ", "ﾌ": "ふ", "ﾍ": "へ", "ﾎ": "ほ",
		"ﾏ": "ま", "ﾐ": "み", "ﾑ": "む", "ﾒ": "め", "ﾓ": "も",
		"ﾔ": "や", "ﾕ": "ゆ", "ﾖ": "よ",
		"ﾗ": "ら", "ﾘ": "り", "ﾙ": "る", "ﾚ": "れ", "ﾛ": "ろ",
		"ﾜ": "わ", "ｦ": "を", "ﾝ": "ん",
	},
	ROMOVES: "ﾞ・），ﾟ･（。、ー「」｡､ｰ｢｣".split(""),
	WIDEUA: "Ａ".charCodeAt(0),
	WIDEUZ: "Ｚ".charCodeAt(0),
	WIDELA: "ａ".charCodeAt(0),
	WIDELZ: "ｚ".charCodeAt(0),
	WIDE0: "０".charCodeAt(0),
	WIDE9: "９".charCodeAt(0),
	CODEA: "A".charCodeAt(0),
	CODE0: "0".charCodeAt(0),

	/**
	 * @param {string} str
	 * @return {string}
	 */
	kiyoneStr: function(str){
		/** @type {CharUtilType} */
		var _this = zbCharUtil;
		/** @type {Array<string>} */
		var arr = str.split("");
		/** @type {string} */
		var ret = "";
		for(var i=0; i<arr.length; i++){
			/** @type {string} */
			var ch = arr[i];
			/** @type {string} */
			var cr = _this.KANAMAP[ch];
			if(!cr){
				if(_this.ROMOVES.indexOf(ch) >= 0){
					cr = "";
				}else{
					/** @type {number} */
					var cd = ch.charCodeAt(0);
					if(cd >= _this.WIDEUA && cd <= _this.WIDEUZ){
						cr = String.fromCharCode(cd - _this.WIDEUA + _this.CODEA);
					}else if(cd >= _this.WIDELA && cd <= _this.WIDELZ){
						cr = String.fromCharCode(cd - _this.WIDELA + _this.CODEA);
					}else if(cd >= _this.WIDE0 && cd <= _this.WIDE9){
						cr = String.fromCharCode(cd - _this.WIDE0 + _this.CODE0);
					}else{
						cr = ch.toUpperCase();
					}
				}
			}
			ret += cr;
		}
		return ret;
	},
};

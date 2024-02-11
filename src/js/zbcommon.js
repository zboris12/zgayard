/**
 * Get Attribute Infomation.
 *
 * @param {string} attrValue Attribute Value.
 * @param {string=} attrName Attribute Name.
 * @return {AttributeInfo}
 */
function getAttrInfo(attrValue, attrName){
	/** @type {string} */
	var t = "";
	/** @type {string} */
	var n = "";
	/** @type {string} */
	var v = "";
	if(attrName){
		/** @type {number} */
		var i = attrName.indexOf(".");
		if(i >= 0){
			t = attrName.substring(0, i).toUpperCase();
			n = attrName.slice(i + 1);
		}else{
			n = attrName;
		}
		switch(n.toLowerCase()){
		case "id":
			n = "#";
			break;
		case "class":
			n = ".";
			break;
		}
		v = attrValue;
		
	}else{
		n = attrValue.charAt(0);
		if(n == "#" || n == "."){
			v = attrValue.slice(1);
		}else{
			n = "";
			t = attrValue.toUpperCase();
		}
	}
	return {
		_tag: t,
		_name: n,
		_value: v,
	}
}
/**
 * @param {Element} ele
 * @param {AttributeInfo} attrInfo
 * @return {boolean}
 */
function isTargetElement(ele, attrInfo){
	if(attrInfo._name == "#"){
		return (ele.id == attrInfo._value);
	}else if(attrInfo._name == "."){
		return ele.classList.contains(attrInfo._value);
	}else if(attrInfo._name){
		return (ele.getAttribute(attrInfo._name) == attrInfo._value);
	}else{
		return true;
	}
}
/**
 * Get target element.
 *
 * @param {string} attrValue Attribute Value.
 * @param {string|Element=} parentEle Parent Element.
 * @param {string=} attrName Attribute Name. If e is an attribute value.
 * @return {Array<Element>} Target elements
 */
function getElementsByAttribute(attrValue, parentEle, attrName){
	/** @type {number} */
	var i = 0;
	/** @type {Array<Element>} */
	var eles = [];
	/** @type {HTMLDocument|Element} */
	var p = document;
	if(parentEle){
		if(typeof parentEle == "string"){
			/** @type {Array<Element>} */
			var ps = getElementsByAttribute(parentEle);
			if(ps.length > 0){
				p = ps[0];
			}
		}else{
			p = parentEle;
		}
	}

	/** @type {AttributeInfo} */
	var attrInfo = getAttrInfo(attrValue, attrName);
	if(!attrInfo._tag){
		if(attrInfo._name == "#"){
			eles.push(document.getElementById(attrInfo._value));
		}else if(attrInfo._name == "."){
			/** @type {!HTMLCollection<!Element>} */
			var eles2 = p.getElementsByClassName(attrInfo._value);
			for(i=0; i<eles2.length; i++){
				eles.push(eles2[i]);
			}
		}else{
			attrInfo._tag = "*";
		}
	}
	if(attrInfo._tag){
		/** @type {!NodeList<!Element>} */
		var eles3 = p.getElementsByTagName(attrInfo._tag.toLowerCase()); // svg can't be got by "SVG", so change the tag name to lower case.
		for(i=0; i<eles3.length; i++){
			if(isTargetElement(eles3[i], attrInfo)){
				eles.push(eles3[i]);
			}
		}
	}
	return eles;
}
/**
 * Get target element.
 *
 * @param {string|Event|Element=} e Target hint.
 * @param {string|Element=} parentEle Parent Element.
 * @param {string=} attrName Attribute Name. If e is an attribute value.
 * @return {Element} Target element
 */
function getElement(e, parentEle, attrName){
	/** @type {Element} */
	var ele = null;
	if(!e){
		ele = window.event.currentTarget || window.event.srcElement || window.event.target;
	}else if(typeof e == "string"){
		/** @type {Array<Element>} */
		var eles = getElementsByAttribute(e, parentEle, attrName);
		if(eles.length > 0){
			ele = eles[0];
		}
	}else if(e instanceof Event){
		ele = /** @type {Element} */(e.currentTarget || e.srcElement || e.target);
	}else{
		ele = e;
	}
	return ele;
}
/**
 * Find parent element.
 *
 * @param {string} attrValue Attribute Value.
 * @param {string|Element=} ele Base element.
 * @param {string=} attrName Attribute Name. If e is an attribute value.
 * @param {boolean=} notMe Include ele or not.
 * @return {Element|null} Parent element
 */
function findParent(attrValue, ele, attrName, notMe){
	/** @type {Element} */
	var e = null;
	if(ele){
		if(typeof ele == "string"){
			e = getElement(ele);
		}else{
			e = ele;
		}
	}else{
		e = getElement();
	}
	if(notMe){
		e = e.parentElement;
	}
	/** @type {AttributeInfo} */
	var attrInfo = getAttrInfo(attrValue, attrName);
	while(e){
		if(e.tagName == attrInfo._tag || !attrInfo._tag){
			if(isTargetElement(e, attrInfo)){
				break;
			}
		}
		e = e.parentElement;
	}
	return e;
}
/**
 * Element is visible or not.
 *
 * @param {Element} ele Target element.
 * @return {boolean} Visible or not.
 */
function isVisible(ele) {
    return !!(ele.offsetWidth || ele.offsetHeight || ele.getClientRects().length);
}
/**
 * Show an element.
 *
 * @param {string|Event|Element|null} e Target hint.
 */
function showElement(e){
	/** @type {Element} */
	var ele = getElement(e);
	if(ele && ele.style.display){
		ele.style.display = "";
	}
}
/**
 * Hide an element.
 *
 * @param {string|Event|Element|null} e Target hint.
 */
function hideElement(e){
	/** @type {Element} */
	var ele = getElement(e);
	if(ele){
		ele.style.display = "none";
	}
}
/**
 * Find next element.
 *
 * @param {Element} ele Base element.
 * @param {string=} attr Attribute to find.
 * @return {?Element} Next element
 */
function nextElement(ele, attr){
	/** @type {Element} */
	var tgt = ele.nextElementSibling;
	if(tgt && attr){
		/** @type {string} */
		var typ = attr.charAt(0);
		switch(attr.charAt(0)){
		case "#":
			attr = attr.slice(1);
			while(tgt && tgt.id != attr){
				tgt = tgt.nextElementSibling;
			}
			break;
		default:
			attr = attr.toUpperCase();
			while(tgt && tgt.tagName != attr){
				tgt = tgt.nextElementSibling;
			}
			break;
		}
	}
	return tgt;
}
/**
 * Find previous element.
 *
 * @param {Element} ele Base element.
 * @param {string=} attr Attribute to find.
 * @param {boolean=} childFlg Find child or not.
 * @return {?Element} Previous element
 */
function previousElement(ele, attr, childFlg){
	/** @type {Element} */
	var tgt = null;
	if(childFlg){
		tgt = ele.lastElementChild;
	}else{
		tgt = ele.previousElementSibling;
	}
	if(tgt && attr){
		/** @type {string} */
		var typ = attr.charAt(0);
		switch(attr.charAt(0)){
		case "#":
			attr = attr.slice(1);
			while(tgt && tgt.id != attr){
				tgt = tgt.previousElementSibling;
			}
			break;
		default:
			attr = attr.toUpperCase();
			while(tgt && tgt.tagName != attr){
				tgt = tgt.previousElementSibling;
			}
			break;
		}
	}
	return tgt;
}
/**
 * @param {Element} ele
 * @param {string} attrName
 * @return {number}
 */
function getIntAttr(ele, attrName){
	return parseInt(ele.getAttribute(attrName), 10);
}
/**
 * @param {!Blob} blob
 * @param {string} fnm
 * @param {Element=} lnk
 */
function downloadBlob(blob, fnm, lnk){
	if(window.navigator.msSaveBlob){
		window.navigator.msSaveBlob(blob, fnm);
	}else if(lnk){
		lnk.download = fnm;
		lnk.href = window.URL.createObjectURL(blob);
		lnk.click();
	}else{
		throw new Error("Element for download is not specified.");
	}
}
/**
 * Analyze url parameters.
 *
 * @param {string|null} str Query string.
 * @return {Object<string, string>|null} Url parameters
 */
function analyzeUrlParams(str){
	if(!str){
		return null;
	}

	/** @type {string} */
	var c = str.charAt(0);
	if(c == "?" || c == "#"){
		str = str.substring(1);
	}
	/** @type {Object<string, string>} */
	var ret = new Object();
	str.split("&").forEach(function(a_ele){
		var a_idx = a_ele.indexOf("=");
		if(a_idx < 0){
			ret[decodeURIComponent(a_ele)] = "";
		}else{
			ret[decodeURIComponent(a_ele.substring(0, a_idx))] = decodeURIComponent(a_ele.substring(a_idx+1));
		}
	});
	return ret;
}
/**
 * Get url parameters from query string.
 *
 * @return {Object<string, string>|null} Url parameters
 */
function getQueryParameters(){
	/** @type {Object<string, string>} */
	var uparams  = analyzeUrlParams(window.location.search);
	/** @type {Object<string, string>} */
	var uparams2 = analyzeUrlParams(window.location.hash);
	if(uparams2){
		if(uparams){
			uparams = Object.assign(uparams, uparams2);
		}else{
			uparams = uparams2;
		}
	}
	return uparams;
}
/**
 * Create a query string with ?.
 *
 * @param {Object<string, string>} query
 * @param {boolean=} noEncode
 * @return {string}
 */
function makeQueryString(query, noEncode){
	/** @type {Array<string>} */
	var qarr = [];
	/** @type {string} */
	var k;
	for(k in query){
		if(noEncode){
			qarr.push(k.concat("=").concat(query[k]));
		}else{
			qarr.push(encodeURIComponent(k).concat("=").concat(encodeURIComponent(query[k])));
		}
	}
	if(qarr.length > 0){
		return "?".concat(qarr.join("&"));
	}else{
		return "";
	}
}

/**
 * @param {Element} sp span which contains svg
 * @param {string} sid id of image
 * @param {string=} fl The color of style fill.
 * @param {string=} sk The color of style stroke.
 */
function setSvgImage(sp, sid, fl, sk){
	/** @type {Element} */
	var b_svg = getElement("svg", sp);
	/** @type {Element} */
	var b_use = document.createElementNS("http://www.w3.org/2000/svg", "use");
	b_use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#".concat(sid));
	if(!b_svg){
		b_svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		sp.appendChild(b_svg);
	}
	b_svg.appendChild(b_use);
	if(fl){
		b_svg.style.fill = fl;
	}
	if(sk){
		b_svg.style.stroke = sk;
	}
}

/**
 * Format a number.
 *
 * @param {number} n Target number.
 * @return {string} Formatted string
 */
function formatNumber(n){
	/** @type {string} */
	var str = n.toString();
	/** @type {number} */
	var i = str.indexOf(".");
	/** @type {Array<string>} */
	var arr = str.split("");
	/** @type {Array<string>} */
	var ret = new Array();
	if(i >= 0){
		ret.push(str.slice(i));
	}else{
		i = arr.length;
	}
	/** @type {number} */
	var j = 0;
	while(i > 0){
		if(j++ == 3){
			ret.unshift(",");
			j = 1;
		}
		ret.unshift(arr[--i]);
	}
	return ret.join("");
}
/**
 * Get a fomatted string of size to display.
 *
 * @param {number} s Size.
 * @return {string} Formatted string
 */
function getSizeDisp(s){
	/** @type {string} */
	var unit;
	/** @type {number} */
	var num;
	if(!s){
		unit = "B";
		num = 0;
	}else if(s < 1024){
		unit = "B";
		num = s;
	}else if(s < 1048576){ // 1024*1024
		unit = "KB";
		num = Math.round(s/102.4)/10;
	}else if(s < 1073741824){ // 1024*1024*1024
		unit = "MB";
		num = Math.round(s/104857.6)/10;
	}else{
		unit = "GB";
		num = Math.round(s/107374182.4)/10;
	}
	return formatNumber(num).concat(unit);
}
/**
 * Get a fomatted string of time to display.
 *
 * @param {number} t Time which unit is second.
 * @return {string} Formatted string
 */
function getTimeDisp(t){
	/** @type {number} */
	var s = t % 60;
	t = (t - s) / 60;
	/** @type {number} */
	var m = t % 60;
	/** @type {number} */
	var h = (t - m) / 60;
	/** @type {Array<string>} */
	var hms = new Array();
	if(h > 0){
		hms.push(h.toString(10));
	}
	hms.push("0".concat(m).slice(-2));
	hms.push("0".concat(s).slice(-2));
	return hms.join(":");
}
/**
 * Get the elapsed time from base time.
 *
 * @param {number} basetime
 * @return {string} Formatted time string
 */
function getElapsedTime(basetime){
	/** @type {number} */
	var t = Math.floor((Date.now() - basetime) / 1000);
	return getTimeDisp(t);
}
/**
 * Get a fomatted string of timestamp to display.
 *
 * @param {string} tms Timestamp.
 * @return {string} Formatted string
 */
function getTimestampDisp(tms){
	if(tms){
		/** @type {Date} */
		var dt = new Date(tms);
		/** @type {Array<number>} */
		var ymd = new Array();
		/** @type {Array<string>} */
		var hms = new Array();
		ymd.push(dt.getFullYear());
		ymd.push(dt.getMonth()+1);
		ymd.push(dt.getDate());
		hms.push("0".concat(dt.getHours()).slice(-2));
		hms.push("0".concat(dt.getMinutes()).slice(-2));
		hms.push("0".concat(dt.getSeconds()).slice(-2));
		return ymd.join("-") + " " + hms.join(":");
	}else{
		return "";
	}
}
/**
 * Repalce one character to another character in the string.
 *
 * @param {string} fChars From character.
 * @param {string} tChars To character.
 * @param {string} str Target string.
 * @return {string} The string after replacing
 */
function charsReplace(fChars, tChars, str){
	/** @type {Array<string>} */
	var ret = new Array();
	str.split("").forEach(function(/** string */a_c){
		/** @type {number} */
		var a_i = fChars.indexOf(a_c);
		if(a_i < 0){
			ret.push(a_c);
		}else{
			ret.push(tChars[a_i]);
		}
	});
	return ret.join("");
}

/**
 * Analyze the current position from Content Range.
 *
 * @param {string|null} crng Content Range.
 * @return {number} The current position
 */
function analyzeRangePos(crng){
	if(!crng){
		return 0;
	}
	/** @type {number} */
	var i = crng.indexOf("-");
	if(i < 0){
		return 0;
	}else{
		i++;
	}
	/** @type {number} */
	var j = crng.indexOf("/", i);
	if(j <= i){
		return 0;
	}else{
		return parseInt(crng.slice(i, j), 10);
	}
}
/**
 * Get utf8 bytes count of a string.
 *
 * @param {string} str
 * @return {number} The bytes count
 */
function getStringLength(str){
	/**
	 * The characters that will be URL encoded.
	 * @const {string}
	 */
	const ESCAPECHAR = ";,/?:@&=+$ ";
	// URLエンコードされたUTF-8文字列表現の桁数とバイト数の対応テーブル
	// encodeURI("あ") → "%E3%81%82" (9桁) → 3バイト
	/**
	 * Correspondence table of bytes count and the bytes count of
	 *  UTF-8 string under URL encoded.
	 * For example: encodeURI("あ") → "%E3%81%82" (9 bytes) → 3 bytes
	 * @const {Array<number>}
	 */
	const ESCAPEDLEN_TABLE = [ 0, 1, 1, 1, 2, 3, 2, 3, 4, 3 ];
	/** @type {number} */
	var sz = 0;
	/** @type {number} */
	var i = 0;
	if(str){
		for(i=0; i<str.length; i++){
			/** @type {string} */
			var c = str.charAt(i);
			if(ESCAPECHAR.indexOf(c) >= 0){
				sz++;
			}else{
				sz += ESCAPEDLEN_TABLE[encodeURI(c).length];
			}
		}
	}
	return sz;
}

/**
 * Sleep milliseconds.
 *
 * @param {number} ms
 * @return {!Promise<void>}
 */
function sleep(ms){
	return new Promise(function(resolve, reject){
		setTimeout(resolve, ms);
	});
}

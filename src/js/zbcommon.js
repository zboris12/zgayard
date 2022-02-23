/**
 * Get target element.
 *
 * @param {string|Event|EventTarget=} e Target hint.
 * @return {EventTarget} Target element
 */
function getElement(e){
	/** @type {EventTarget} */
	var ele = null;
	if(!e){
		ele = window.event.srcElement || window.event.target;
	}else if(typeof e == "string"){
		switch(e.charAt(0)){
		case "#":
			ele = document.getElementById(e.slice(1));
			break;
		}
	}else if(e instanceof Event){
		ele = e.srcElement || e.target;
	}else{
		ele = e;
	}
	return ele;
}
/**
 * Find parent element.
 *
 * @param {Element} ele Base element.
 * @param {string|null} tag TagName to find.
 * @return {Element|null} Parent element
 */
function findParent(ele, tag){
	/** @type {Element} */
	var p = ele.parentElement;
	if(p){
		if(p.tagName == tag){
			return p;
		}else{
			return findParent(p, tag);
		}
	}else{
		return null;
	}
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
 * Hide an element.
 *
 * @param {string|Event|EventTarget|null} e Target hint.
 */
function hideElement(e){
	/** @type {EventTarget} */
	var ele = getElement(e);
	if(ele){
		ele.style.display = "none";
	}
}
/**
 * Get table and it's body.
 *
 * @param {string|Event|EventTarget=} e Target hint.
 * @param {number=} idx Index of body.
 * @return {TableBody|null} Table and it's body
 */
function getTableBody(e, idx){
	/** @type {Element} */
	var tbl = /** @type {Element} */(getElement(e));
	/** @type {Element} */
	var tbdy = null;
	if(tbl){
		/** @type {number} */
		var i = 0;
		if(idx){
			i = idx;
		}
		tbdy = tbl.getElementsByTagName("tbody")[i];
		return {
			_table: tbl,
			_tbody: tbdy,
		};
	}else{
		return null;
	}
}
/**
 * Find next element.
 *
 * @param {Element} ele Base element.
 * @param {string|null} attr Attribute to find.
 * @return {Element|null} Next element
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
	if(s < 1024){
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
 * Get a fomatted string of timestamp to display.
 *
 * @param {string} tms Timestamp.
 * @return {string} Formatted string
 */
function getTimestampDisp(tms){
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
 * Open an ajax connection.
 *
 * @param {string} url
 * @param {AjaxOption} opt
 * @return {XMLHttpRequest} An instance of ajax
 *
 * opt: {
 *   _method: "PUT",
 *   _headers: {"Content-Type": "text/html"},
 *   _doneFunc: function(a_status, a_restext){},
 * }
 */
function openAjax(url, opt){
	/** @type {string} */
	var method = "POST";
	/** @type {XMLHttpRequest} */
	var ajax = new XMLHttpRequest();
 	if(opt && opt._method){
		method = opt._method;
	}
	ajax.open(method, url, true);
	if(opt && opt._headers){
		for(var key in opt._headers){
			ajax.setRequestHeader(key, opt._headers[key]);
		}
	}
	ajax.onload = function(/** Event */evt){
		var x = evt.target;
		if (x.readyState == 4){
			if(x.status >= 200 && x.status <= 299){
				if(opt && opt._doneFunc){
					opt._doneFunc(x.status, x.responseText);
				}
			}else{
				alert(x.responseText+" ("+x.status+")");
			}
		}
	};
	return ajax;
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

function getElement(e){
	var ele = null;
	if(!e){
		ele = event.srcElement || event.target;
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
function findParent(ele, tag){
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
function isVisible(ele) {
    return !!(ele.offsetWidth || ele.offsetHeight || ele.getClientRects().length);
}
function hideElement(e){
	var ele = getElement(e);
	if(ele){
		ele.style.display = "none";
	}
}
function getTableBody(e, idx){
	var tbl = getElement(e);
	var tbdy = null;
	if(tbl){
		if(!idx){
			idx = 0;
		}
		tbdy = tbl.getElementsByTagName("tbody")[idx];
		return {
			"table": tbl,
			"tbody": tbdy,
		};
	}else{
		return null;
	}
}
function nextElement(ele, attr){
	var tgt = ele.nextElementSibling;
	if(tgt && attr){
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
function previousElement(ele, attr, childFlg){
	var tgt = null;
	if(childFlg){
		tgt = ele.lastElementChild;
	}else{
		tgt = ele.previousElementSibling;
	}
	if(tgt && attr){
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
function analyzeUrlParams(str){
	if(!str){
		return null;
	}

	var c = str.charAt(0);
	if(c == "?" || c == "#"){
		str = str.substring(1);
	}
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

function getQueryParameters(){
	var uparams  = analyzeUrlParams(window.location.search);
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

function getSizeDisp(s){
	if(s < 1024){
		return s + "B";
	}else if(s < 1048576){ // 1024*1024
		return Math.round(s/102.4)/10 + "KB";
	}else{
		return Math.round(s/104857.6)/10 + "MB";
	}
}
function getTimestampDisp(tms){
	var dt = new Date(tms);
	var ymd = new Array();
	var hms = new Array();
	ymd.push(dt.getFullYear());
	ymd.push(dt.getMonth()+1);
	ymd.push(dt.getDate());
	hms.push("0".concat(dt.getHours()).slice(-2));
	hms.push("0".concat(dt.getMinutes()).slice(-2));
	hms.push("0".concat(dt.getSeconds()).slice(-2));
	return ymd.join("-") + " " + hms.join(":");
}

// opt: {
//   "method": "PUT",
//   "headers": {"Content-Type": "text/html"},
//   "doneFunc": function(status, restext){},
// }
function openAjax(url, opt){
	var method = "POST";
	var ajax = new XMLHttpRequest();
 	if(opt && opt.method){
		method = opt.method;
	}
	ajax.open(method, url, true); //非同期
	if(opt && opt.headers){
		for(var key in opt.headers){
			ajax.setRequestHeader(key, opt.headers[key]);
		}
	}
	ajax.onload = function(evt){
		var x = evt.target;
		if (x.readyState == 4){
			if(x.status >= 200 && x.status <= 299){
				if(opt && opt.doneFunc){
					opt.doneFunc(x.status, x.responseText);
				}
			}else{
				alert(x.responseText+" ("+x.status+")");
			}
		}
	};
	return ajax;
}

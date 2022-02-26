(function(){
	const jss = [
		"js/zbcommon.js",
		"js/zbcrypto.js",
		"js/zbidxdb.js",
		"js/zbonedrive.js",
		"js/const.js",
		"js/worker-const.js",
		"js/settings.js",
		"js/main.js",
		"js/downup.js",
		"js/main-assign.js",
		"js/event.js",
	];

	var idx = 0;
	var func = function(){
		if(idx >= jss.length){
			return;
		}
		var a_script = document.createElement("script");
		a_script.setAttribute("type", "text/javascript");
		a_script.setAttribute("src", jss[idx++]);
		a_script.addEventListener("load", func);
		document.head.appendChild(a_script);
	};
	func();
})();

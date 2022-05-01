window.addEventListener("load", function(){
	window.addEventListener("scroll", function(){
		document.getElementById("divGround").style.top = (document.documentElement.scrollTop || document.body.scrollTop) + "px";
	});
	/** @type {Element} */
	var ele = document.getElementById("spanNotify");
	ele.style.display = "none";
	/**
	 * "input file multiple" is not supported in Android, so we need to add "input file" manually.
	 *
	 * @type {RegExp}
	 */
	var reg = new RegExp("android", "i");
	/** @type {boolean} */
	var isAndroid = reg.test(navigator.userAgent);

	/** @type {number} */
	var i = 0;
	/** @type {!NodeList<!Element>} */
	var eles = document.getElementById("divSet").getElementsByTagName("input");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("wordid")){
		case "btnLogout":
			ele.addEventListener("click", logout);
			break;
		case "btnCancel":
			ele.addEventListener("click", hideSettings);
			break;
		case "btnOk":
			ele.addEventListener("click", saveSettings);
			break;
		}
	}

	eles = document.getElementById("divPwd").getElementsByTagName("span");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("tid")){
		case "spanAddRoot":
			ele.addEventListener("click", showAddRoot);
			break;
		case "spanDeleteRoot":
			ele.addEventListener("click", deleteRoot);
			break;
		case "spanMoreKey":
			if(isAndroid){
				ele.addEventListener("click", moreKeyf);
			}else{
				ele.style.display = "none";
			}
			break;
		case "spanClearKey":
			if(isAndroid){
				ele.addEventListener("click", clearKeyf);
			}else{
				ele.style.display = "none";
			}
			break;
		}
	}
	eles = document.getElementById("divPwd").getElementsByTagName("input");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("wordid")){
		case "btnCancel":
			ele.addEventListener("click", hideSetPwd);
			break;
		case "btnOk":
			ele.addEventListener("click", setPassword);
			break;
		case "btnDropDb":
			ele.addEventListener("click", dropLoacalDb);
			break;
		}
	}

	eles = document.getElementById("divHeader").getElementsByTagName("input");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("wordid")){
		case "btnSet":
			ele.addEventListener("click", showSettings);
			break;
		}
	}

	document.getElementById("chkAll").addEventListener("click", selectAll);

	eles = document.getElementById("divAction").getElementsByTagName("input");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("wordid")){
		case "btnDownfs":
			ele.addEventListener("click", download);
			break;
		case "btnMovefs":
			ele.addEventListener("click", showMove);
			break;
		case "btnDelfs":
			ele.addEventListener("click", deleteItems);
			break;
		case "btnHistory":
			ele.addEventListener("click", /** function(Event) */function(a_evt){
				/** @type {Element} */
				var a_div = document.getElementById("divHistory");
				if(a_div.style.display == "block"){
					a_div.style.display = "";
				}else{
					a_div.style.display = "block";
				}
			});
			break;
		case "btnNewFldr":
			ele.addEventListener("click", newFolder);
			break;
		case "btnUpfs":
			ele.addEventListener("click", upload);
			break;
		case "btnUpfld":
			ele.addEventListener("click", /** function(Event) */function(){
				upload(1);
			});
			break;
		}
	}

	ele = document.getElementById("tblQueue").getElementsByTagName("th")[0];
	ele.getElementsByTagName("label")[0].addEventListener("click", hideQueueRows);

	document.getElementById("divItemenu").addEventListener("click", clickMenu);

	ele = document.getElementById("divNewName");
	ele.getElementsByTagName("input")[0].addEventListener("keypress", keypressNewname);
	ele.getElementsByTagName("span")[0].addEventListener("click", admitRename);

	ele = document.getElementById("divGround").firstElementChild;
	ele.addEventListener("click", hideGround);
	ele.firstElementChild.addEventListener("click", /** function(Event) */function(a_evt){
		a_evt.stopPropagation();
	});

	ele = nextElement(document.getElementById("spanGroundTitle"), "label");
	ele.addEventListener("click", hideGround);

	/** @type {HTMLCollection} */
	var rows = document.getElementById("tblFileDetail").getElementsByTagName("tbody")[0].rows
	ele = rows[0];
	ele.cells[0].addEventListener("click", /** function(Event) */function(a_evt){
		clickItem(1);
	});
	ele.cells[2].addEventListener("click", /** function(Event) */function(a_evt){
		clickItem(2);
	});
	ele.getElementsByTagName("img")[0].addEventListener("load", imageLoaded);
	ele = ele.getElementsByTagName("video")[0];
	ele.addEventListener("canplay", restoreTime);
	ele.addEventListener("ended", function(){
		clickItem(2, true);
	});
	ele.addEventListener("error", resetVideoSrc);
	eles = rows[2].getElementsByTagName("input");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("wordid")){
		case "btnDownload":
			ele.addEventListener("click", /** function(Event) */function(a_evt){
				download(1);
			});
			break;
		}
	}

	eles = document.getElementById("tblFolder").getElementsByTagName("input");
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("wordid")){
		case "btnOk":
			ele.addEventListener("click", moveToFolder);
			break;
		}
	}

	onbody();
});

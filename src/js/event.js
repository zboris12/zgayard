/** @type {?TouchPosition} */
var g_touchPoSt = null;

/**
 * @param {MenuType} mtyp
 * @return {?MenuSwithInfo}
 */
function getMenuInfo(mtyp){
	/** @type {Element} */
	var ele = null;
	/** @type {?MenuSwithInfo} */
	var ret = null;
	switch(mtyp){
	case MenuType.NAV:
		ele = getElement(".zb-nav-tools");
		ret = {
			_button: getElement("button", ele),
			_menu: nextElement(ele),
		};
		break;
	case MenuType.MAIN:
		ele = getElement("button", getElement(".zb-main-header", "#divMain"));
		ret = {
			_button: ele,
			_menu: nextElement(ele),
		};
		break;
	case MenuType.ITEM:
		ret = {
			_menu: getElement("#ulIteMenu"),
		};
		break;
	default:
		return null;
	}
	return ret;
}
/**
 * @param {MenuType} mtyp
 */
function addMenuButtonEvent(mtyp){
	/** @type {?MenuSwithInfo} */
	var menuInfo = getMenuInfo(mtyp);
	if(!menuInfo){
		return;
	}
	menuInfo._menu.style.display = "none";
	menuInfo._menu.style.maxHeight = "0px";
	if(menuInfo._button){
		menuInfo._button.addEventListener("click", /** @type {function(Event)} */(function(a_evt){
			/** @type {MenuType} */
			a_evt.buttonKey = mtyp;
		}));
	}
}
/**
 * @param {Event} evt
 * @param {MenuType} mtyp
 */
function switchMenu(evt, mtyp){
	/** @type {?MenuSwithInfo} */
	var menuInfo = getMenuInfo(mtyp);
	if(!menuInfo){
		return;
	}
	if(menuInfo._menu.style.display){
		if(menuInfo._menu.style.maxHeight){
			if(evt.buttonKey == mtyp){
				showElement(menuInfo._menu);
				if(menuInfo._button){
					hideElement(menuInfo._button.children[0]);
					showElement(menuInfo._button.children[1]);
				}
				window.setTimeout(function(){
					menuInfo._menu.style.maxHeight = "";
					menuInfo._menu.style.paddingTop = "";
					menuInfo._menu.style.paddingBottom = "";
				}, 50);
			}
		}else{
			// It's in the way to show the menu
			return;
		}
	}else if(menuInfo._menu.style.maxHeight){
		// It's in the way to hide the menu
		return;
	}else if(!(evt.buttonKey == mtyp && !menuInfo._button)){
		// Do not hide menu if there is no switch button when need show menu such as item menu.
		menuInfo._menu.style.paddingBottom = "0px";
		menuInfo._menu.style.maxHeight = "0px";
		window.setTimeout(function(){
			if(menuInfo._button){
				showElement(menuInfo._button.children[0]);
				hideElement(menuInfo._button.children[1]);
			}
			menuInfo._menu.style.paddingTop = "0px";
			hideElement(menuInfo._menu);
		}, 500);
	}
}
/**
 * @param {Event} evt
 */
function documentClick(evt){
	switchMenu(evt, MenuType.NAV);
	switchMenu(evt, MenuType.MAIN);
	switchMenu(evt, MenuType.ITEM);
	if(evt.buttonKey != MenuType.TEXT){
		hideElement("#divInpName");
	}
}

/**
 * @param {Event} evt
 */
function divCheckbox(evt){
	var ele = /** @type {Element} */(evt.target || evt.srcElement);
	if(ele.tagName == "INPUT"){
		return;
	}
	ele = getElement("input", findParent("div", ele));
	ele.focus();
	ele.click();
}

/**
 * @param {Element} mnu
 */
function addMenuEvent(mnu){
	/** @type {Element} */
	var l = findParent("li", mnu);
	switch(mnu.getAttribute("iid")){
	case "menuGeneral":
		l.addEventListener("click", showSettings);
		break;
	case "menuDrive":
		l.addEventListener("click", showInputPassword);
		break;
	case "menuHistory":
		l.addEventListener("click", function(a_evt){
			getElement("#divHistory").style.top = "";
		});
		break;
	}
}

/**
 * @param {Event} evt
 */
function clickMainMenu(evt){
	/** @type {Element} */
	var ele = getElement("label", findParent("li"));
	/** @type {string} */
	var act = ele.getAttribute("iid");
	/** @type {function()|undefined} */
	var func = undefined;
	ele = nextElement(ele);
	if(ele){
		func = function(){
			ele.classList.remove("rotate-90");
		};
	}
	switch(act){
	case "menuNewFldr":
		if(ele){
			ele.classList.add("rotate-90");
		}
		showModal("new", func);
		break;
	case "menuUpload":
		if(ele){
			ele.classList.add("rotate-90");
		}
		showModal("upload", function(){
			getElement("#upfiles").value = null;
			getElement("#upfolder").value = null;
			if(func){
				func();
			}
		});
		break;
	case "menuMovefs":
		if(ele){
			ele.classList.add("rotate-90");
		}
		showMove(func);
		break;
	case "menuDownfs":
		/** @type {Array<DriveItem>} */
		var files = getMultiChecked(true);
		if(files){
			download(files);
		}
		break;
	case "menuDelfs":
		deleteItems();
		break;
	}
}

window.addEventListener("load", function(evt){
	/**
	 * "input file multiple" is not supported in Android, so we need to add "input file" manually.
	 *
	 * @type {RegExp}
	 */
	var reg = new RegExp("android", "i");
	/** @type {boolean} */
	var isAndroid = reg.test(navigator.userAgent);

	/** @type {Element} */
	var ele = getElement("#divMessage");
	/** @type {Array<Element>} */
	var eles = getElementsByAttribute("span", ele);
	eles[eles.length - 1].children[0].addEventListener("click", function(a_evt){
		showMessage(MessageType.NONE);
	});

	document.addEventListener("click", documentClick);
	addMenuButtonEvent(MenuType.NAV);
	addMenuButtonEvent(MenuType.MAIN);
	addMenuButtonEvent(MenuType.ITEM);

	/** @type {number} */
	var i = 0;
	/** @type {number} */
	var j = 0;
	eles = getElementsByAttribute("span", getElement(".zb-nav-tools"));
	for(i=0; i<eles.length; i++){
		addMenuEvent(eles[i]);
	}
	eles = getElementsByAttribute("label", getElement(".zb-nav-menu"));
	for(i=0; i<eles.length; i++){
		addMenuEvent(eles[i]);
	}

	eles = getElementsByAttribute(".zb-settings");
	for(i=0; i<eles.length; i++){
		/** @type {Array<Element>} */
		var chks = getElementsByAttribute(".checkbox", eles[i]);
		for(j=0; j<chks.length; j++){
			chks[j].addEventListener("click", divCheckbox);
		}
	}

	getElement("#chkOwnSecret").addEventListener("click", function(a_evt){
		var a_chk = /** @type {Element} */(a_evt.target || a_evt.srcElement);
		/** @type {Array<Element>} */
		var a_divs = getElementsByAttribute(".ownsecret", "#divSet");
		/** @type {number} */
		var a_j = 0;
		for(a_j=0; a_j<a_divs.length; a_j++){
			if(a_chk.checked){
				showElement(a_divs[a_j]);
			}else{
				hideElement(a_divs[a_j]);
			}
		}
	});

	ele = getElement("#divSet");
	// getElement("lnkTos", ele, "a.iid").addEventListener("click", function(a_evt){
		// a_evt.stopPropagation();
	// });
	eles = getElementsByAttribute("button", ele);
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("iid")){
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

	eles = getElementsByAttribute("span", getElement("#divPwd"));
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
	eles = getElementsByAttribute("button", getElement("#divPwd"));
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("iid")){
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

	ele = getElement("#divModal");
	ele.addEventListener("click", hideModal);
	ele.children[0].addEventListener("click", function(a_evt){
		a_evt.stopPropagation();
	});
	eles = getElementsByAttribute("button", ele);
	for(i=0; i<eles.length; i++){
		ele = eles[i];
		switch(ele.getAttribute("iid")){
		case "btnCancel":
			ele.addEventListener("click", hideModal);
			break;
		case "btnOk":
			ele.addEventListener("click", okModal);
			break;
		}
	}

	eles = getElementsByAttribute(".zb-main-menu");
	for(i=0; i<eles.length; i++){
		/** @type {Array<Element>} */
		var lis = getElementsByAttribute("li", eles[i]);
		for(j=0; j<lis.length; j++){
			lis[j].addEventListener("click", clickMainMenu);
		}
	}

	ele = getElement("#chkAll");
	ele.addEventListener("click", selectAll);
	nextElement(ele).addEventListener("click", selectAll);

	eles = getElementsByAttribute("li", "#ulIteMenu");
	for(i=0; i<eles.length; i++){
		eles[i].addEventListener("click", clickIteMenu);
	}

	ele = getElement("#divInpName");
	ele.addEventListener("click", function(a_evt){
		a_evt.stopPropagation();
	});
	getElement("input", ele).addEventListener("keyup", keyupNewname);
	getElement("span", ele).addEventListener("click", admitRename);

	ele = getElement("#diViewer");
	ele.addEventListener("click", switchShowPrevNext);
	ele.addEventListener("touchstart", function(a_evt){
		if(g_touchPoSt || a_evt.changedTouches.length != 1){
			return;
		}
		/** @type {Touch} */
		var a_t = a_evt.changedTouches[0];
		g_touchPoSt = {
			_id: a_t.identifier,
			_x: a_t.screenX,
			_y: a_t.screenY,
		};
	});
	ele.addEventListener("touchend", function(a_evt){
		if(g_touchPoSt){
			/** @type {Touch} */
			var a_t = null;
			/** @type {number} */
			var a_i = 0;
			for(a_i=0; a_i<a_evt.changedTouches.length; a_i++){
				if(a_evt.changedTouches[a_i].identifier == g_touchPoSt._id){
					a_t = a_evt.changedTouches[a_i];
					break;
				}
			}
			if(!a_t){
				g_touchPoSt = null;
				return;
			}
			
			/** @type {number} */
			var a_moveX = a_t.screenX - g_touchPoSt._x;
			/** @type {number} */
			var a_moveY = a_t.screenY - g_touchPoSt._y;
			if(a_moveY < 10 && a_moveY > -10){
				if(a_moveX > 50){
					/* slide left to right means change to previous */
					clickPrevious();
				}else if(a_moveX < -50){
					/* slide right to left means change to next */
					clickNext();
				}
			}
			g_touchPoSt = null;
		}
	});
	getElement("button", ele).addEventListener("click", function(){
		downloadById(findParent("div").getAttribute("uid"));
	});
	getElement("img", ele).addEventListener("load", imageLoaded);
	ele = getElement("video", ele);
	ele.addEventListener("canplay", restoreTime);
	ele.addEventListener("ended", function(){
		clickItem(findParent("div").getAttribute("uid"), 2, true);
	});
	// screen.orientation.addEventListener("change", function(a_evt){
		// if(a_evt.currentTarget.type == "landscape-primary"){
			// /** @type {Element} */
			// var a_div = getElement("#diViewer");
			// /** @type {Element} */
			// var a_vdo = getElement("video", a_div);
			// if(isVisible(a_vdo) && !a_vdo.ended){
				// /** @type {boolean} */
				// var a_flg = !a_vdo.paused;
				// if(a_flg){
					// a_vdo.pause();
				// }
				// findParent("div", a_div, undefined, true).requestFullscreen();
				// if(a_flg){
					// a_vdo.play();
				// }
			// }
		// }else if(document["fullscreen"]){
			// document.exitFullscreen();
		// }
	// });
	document.addEventListener("fullscreenchange", function(a_evt){
		if(document["fullscreen"]){
			getElement("#diViewer").classList.add("full");
		}else{
			getElement("#diViewer").classList.remove("full");
		}
	});

	ele = findParent("zb-viewer", ele, "div.class");
	eles = getElementsByAttribute("span", ele);
	for(i=0; i<eles.length; i++){
		switch(eles[i].getAttribute("name")){
		case "close":
			eles[i].addEventListener("click", exitViewer);
			break;
		case "previous":
			eles[i].addEventListener("click", clickPrevious);
			break;
		case "next":
			eles[i].addEventListener("click", clickNext);
			break;
		case "fullscreen":
			eles[i].addEventListener("click", function(){
				findParent("div", "#diViewer", undefined, true).requestFullscreen();
			});
			break;
		}
	}
	ele = findParent("zb-modal", ele, "div.class");
	ele.addEventListener("click", exitViewer);
	ele.children[0].addEventListener("click", function(a_evt){
		a_evt.stopPropagation();
	});

	getElement(".zb-qbutton").addEventListener("click", function(a_evt){
		getElement("#divQueue").style.top = "";
	});
	getElement("close", "#divQueue", "span.name").addEventListener("click", hideQueue);

	getElement("close", "#divHistory", "span.name").addEventListener("click", function(a_evt){
		getElement("#divHistory").style.top = "100%";
	});

	onbody();
});

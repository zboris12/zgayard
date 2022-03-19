function ZbLocalStorage(){
this.datas = {};

this.isSkipLogin = function(){
	return true;
};
this.getSessionData = function(key){
	return null;
};
this.setSessionData = function(key, data){
	return true;
};
this.checkSessionData = function(key, target){
	return true;
};
this.removeSessionData = function(key){
	return true;
};
this.getDriveData = function(key){
	return this.datas[key];
};
this.saveDriveData = function(key, data, func){
	this.datas[key] = data;
	if(func && func instanceof Function){
		func();
	}
};
}

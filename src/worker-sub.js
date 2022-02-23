self.importScripts("vendor/crypto-js.js");function q(c){if(!c)return null;var f=c.charAt(0);if("?"==f||"#"==f)c=c.substring(1);var b={};c.split("&").forEach(function(a){var e=a.indexOf("=");0>e?b[decodeURIComponent(a)]="":b[decodeURIComponent(a.substring(0,e))]=decodeURIComponent(a.substring(e+1))});return b};function r(c){var f=CryptoJS.MD5(c);c=CryptoJS.kdf.OpenSSL.execute(c,8,4,f);c.iv.clamp();c.key.clamp();return c}function t(c){var f=Array(c.sigBytes);c=c.words;for(var b=0,a=0;a<c.length;a++){for(var e=c[a],d=b+4-1;d>=b;d--)d<f.length&&(f[d]=e&255),e>>=8;b+=4;if(b>=f.length)break}return f}
function u(){this.h=0;this.g=null;this.m=function(c,f){this.h=c;f&&f()};this.write=function(c,f){Array.isArray(c)?this.g=this.g?this.g.concat(c):c.concat():(this.g||(this.g=[]),this.g.push(c));f&&f()};this.cancel=function(c){c&&c(!1,!0)};this.l=function(){if(this.g&&0<this.g.length&&(this.g[0]instanceof ArrayBuffer||this.g[0]instanceof Uint8Array)){for(var c=0,f=0;f<this.g.length;f++)c+=this.g[f].byteLength;c=new Uint8Array(c);var b=0;for(f=0;f<this.g.length;++f){var a=this.g[f];a instanceof ArrayBuffer&&
(a=new Uint8Array(a));c.set(a,b);b+=a.byteLength}return c}return this.g};this.i=function(){var c=this.l();c instanceof Uint8Array||(c=new Uint8Array(c));return new Blob([c],{type:"application/octet-binary"})};this.download=function(c){var f=this.i();if(window.navigator.msSaveBlob)window.navigator.msSaveBlob(f,c);else throw Error("Element for download is not specified.");};this.o=function(){return this.h}}
function v(c){this.j=null;if(c._blob)if(c._blob instanceof Blob)this.j=c._blob;else throw Error("blob is not a Blob.");else throw Error("blob must be specified.");this.s=1600;c.G&&(this.s=c.G);this.g=0;this.m=this.i=null;this.B=function(f,b){if(f){if(f>=this.h())throw Error("offset can not be bigger than input size.");this.g=f}this.i=new FileReader;this.i.onload=function(a){a=a.target.result;this.m&&this.m(a,this)}.bind(this);b&&b()};this.o=function(){return this.g};this.h=function(){return this.j.size};
this.u=function(){return this.g>=this.h()};this.l=function(f){if(1!=this.i.readyState){var b=this.g;this.g=f?this.g+f:this.g+this.s;this.i.readAsArrayBuffer(this.j.slice(b,this.g))}};this.T=function(){this.j=this.i=null}}
function w(c){if(!c.X)if(this.getSuperClass&&"Readable"==this.getSuperClass().name)this.super(void 0),this.h=1;else throw Error("writer must be specified in no stream mode.");this.o=this.A=null;this.u=!0;this.g=null;this.l=c.X;this.iv=this.key=null;this.i=0;this.m=null;this.s=this.j=0;this.speed="-";c.ba&&(this.u=!1);if(c.W)this.g=c.W;else throw Error("reader must be specified.");if(c.C){var f=null;f="string"==typeof c.C?r(c.C):c.C;this.key=f.key;this.iv=f.iv}else throw Error("keycfg must be specified.");
this.start=function(b){if(b){if(this.u)throw Error("Can NOT set offset for encryption.");this.i=b;b-=b%16+16;0>b&&(b=0)}this.g.m=this.I.bind(this);this.g.B(b,function(){var a=16*Math.ceil((this.g.h()+1)/16);this.h||!this.l?this.B():this.l.m(a,this.B.bind(this))}.bind(this))};this.J=function(){if(Date.now()>this.j){var b=1E3*(this.g.o()-this.s)/(Date.now()-this.j+1E3);if(1024>b)var a="B";else 1048576>b?(a="KB",b=Math.round(b/102.4)/10):1073741824>b?(a="MB",b=Math.round(b/104857.6)/10):(a="GB",b=Math.round(b/
1.073741824E8)/10);var e=b.toString();b=e.indexOf(".");var d=e.split(""),h=[];0<=b?h.push(e.slice(b)):b=d.length;for(e=0;0<b;)3==e++&&(h.unshift(","),e=1),h.unshift(d[--b]);this.speed=h.join("").concat(a)+"/s";this.j=Date.now()+1E3;this.s=this.g.o()}return this.speed};this._read=function(b){1==this.h?this.h=2:3==this.h&&(this.g.u()?this.push(null):this.g.l(b))};this.push=function(b){return this.readable?(b&&!this.L?this.superCall("push",new Uint8Array(b)):this.superCall("push",b),!0):!1};this.B=function(){this.j=
Date.now()+1E3;(this.s=this.i)?this.g.l(16):1==this.h?this.h=3:2==this.h?(this.h=3,this.push([])):this.g.l()};this.I=function(b){try{var a=new CryptoJS.lib.WordArray.init(b);if(!this.m){var e={iv:this.iv,mode:CryptoJS.mode.CBC,padding:CryptoJS.pad.Pkcs7};this.i&&(e.iv=a,a=null);this.m=this.u?CryptoJS.algo.AES.createEncryptor(this.key,e):CryptoJS.algo.AES.createDecryptor(this.key,e)}if(a){var d=t(this.m.process(a));this.g.u()&&(d=d.concat(t(this.m.finalize())));if(this.i<this.g.o()){var h=this.i-(this.g.o()-
b.byteLength);0<h&&(d=d.slice(h))}else d=null;this.h?this.push(d):d?this.l&&this.l.write(d,function(){this.g.u()?this.R():this.A?this.A()?this.g.l():this.l.cancel(function(k,l){this.R(k,l)}.bind(this)):this.g.l()}.bind(this)):this.g.l();d=null}else this.h?2==this.h?(this.h=3,this.push([])):this.h=3:this.g.l()}catch(k){if(this.h)throw k;this.R(k)}};this.R=function(b,a){this.g&&(this.g.T(),this.g=null);this.o&&(b?this.o(b):this.o(!1,a))}};function x(){this.h=!0;this.g=null;this.l=!1;this.s=function(){var c=null;if(this.h)try{c=window.sessionStorage.getItem("login_state")}catch(f){this.h=!1,console.error(f)}return c};this.j=function(c){var f=this.s();return f&&c==f?!0:!1};this.i=function(c,f){if(this.h)try{return window.sessionStorage.setItem(c,f.toString()),!0}catch(b){this.h=!1,console.error(b)}return!1};this.o=function(){if(this.h)try{window.sessionStorage.removeItem("login_state")}catch(c){this.h=!1,console.error(c)}};this.A=function(c){if(window.indexedDB){var f=
window.indexedDB.open("zgayard1946");f.onerror=function(){if(c)c("IndexedDB is not supported in your browser settings.");else throw Error("IndexedDB is not supported in your browser settings.");};f.onupgradeneeded=function(b){b.target.result.createObjectStore("settings",{keyPath:"key"})};f.onsuccess=function(b){var a=b.target.result;b=a.transaction("settings","readwrite");b.oncomplete=function(){a.close();c&&c()};b.objectStore("settings").getAll().onsuccess=function(e){this.g={};e.target.result.forEach(function(d){this.g[d.key]=
d.value}.bind(this));this.l=(e=this.g.drive)&&this.g[e]&&this.g[e].refresh_token?!0:!1}.bind(this)}.bind(this)}else if(c)c("IndexedDB is not supported in your browser settings.");else throw Error("IndexedDB is not supported in your browser settings.");};this.u=function(){var c=this.m();return c&&(c=this.g[c])?c.refresh_token:null};this.B=function(c){if(this.g){var f=this.m();c?(this.g[f]||(this.g[f]={}),this.g[f].refresh_token=c):this.g[f]&&delete this.g[f].refresh_token}};this.m=function(){return this.g&&
this.g.drive?this.g.drive:null}};function y(c,f,b){this.j=b;this.o=f;this.h=null;this.g=c;this.i=function(a){var e="POST",d="https://graph.microsoft.com/v1.0".concat(encodeURI(a.v)),h=new XMLHttpRequest;a&&a.P&&(e=a.P);h.open(e,d,!0);a&&a.D?h.setRequestHeader("Authorization",a.D):a&&a.fa?(e="Bearer",a&&a.ga&&(e=a.ga),h.setRequestHeader("Authorization",e+" "+a.fa)):h.setRequestHeader("Authorization",this.h);if(a&&a.O)for(var k in a.O)h.setRequestHeader(k,a.O[k]);a&&a.M&&(h.onload=function(l){l=l.target;4==l.readyState&&(401==l.status&&
this.g.l&&!a.ea?this.A(a):a.M({H:l.status,K:l.responseText}))}.bind(this));h.send(a.aa)};this.s=function(a){this.h=a};this.u=function(){var a=this.g.l,e={};var d=q(window.location.search);var h=q(window.location.hash);h&&(d=d?Object.assign(d,h):h);if(d&&d.token_type&&d.access_token)this.m(d.token_type,d.access_token),d&&d.state&&this.g.j(d.state)&&this.g.o();else if(d&&d.code?e.code=d.code:a&&(e.S=this.g.u()),e.code||e.S){if(d&&d.state)if(this.g.j(d.state))this.g.o();else return;(d=this.l(e))&&d.token_type&&
d.access_token&&(this.m(d.token_type,d.access_token),a&&e.code&&d.refresh_token&&this.g.B(d.refresh_token),d.logout&&this.g.i("logout_url",d.logout))}else a&&(e.Y=!0),(d=this.l(e))&&d.url&&(d.state&&(this.g.i("login_state",d.state)||(d.state=z)),d.logout&&this.g.i("logout_url",d.logout),window.location.href=d.url.concat("&state=".concat(encodeURIComponent(d.state))))};this.$=function(a){return new A(a,this)};this.Z=function(a){return new B(a,this)};this.A=function(a){console.log("Retry to send ajax.");
a&&(a.ea=!0,this.u(),a.D=this.h,this.i(a))};this.m=function(a,e){this.h=a+" "+e;this.g.i("access_token",this.h)};this.l=function(a){if(!a)throw Error("Options are not specifed when auth onedrive.");var e=new FormData;e.append("drive_type","onedrive");a.clientId&&e.append("client_id",a.clientId);a.ia&&e.append("redirect_uri",a.ia);a.ha&&e.append("client_secret",a.ha);a.code?e.append("code",a.code):a.S?e.append("refresh_token",a.S):a.Y&&e.append("need_code",a.Y);a=null;var d=new XMLHttpRequest;d.open("POST",
this.o,!1);d.withCredentials=!0;d.send(e);if(4==d.readyState)if(200==d.status)a=JSON.parse(d.responseText);else throw Error(d.responseText+" ("+d.status+")");return a}}
function A(c,f){this.u=f;this.g=c;this.j="";this.h=this.l=0;if(!this.g||!this.g.F)throw Error("fnm is not specified.");this.m=function(b,a){this.l=b;b={v:"/me",P:"POST",D:this.g.D,O:{"Content-Type":"application/json;charset=UTF-8","Cache-Control":"no-cache",Pragma:"no-cache"},M:function(h){200<=h.H&&299>=h.H?(this.j=JSON.parse(h.K).uploadUrl,a&&a(h)):(console.error(h),alert(JSON.stringify(h)))}.bind(this)};this.g.V?b.v="/me/drive/items/"+this.g.V+":/":this.g.N?(this.g.N.startsWith("/drive/root:")||
(b.v+="/drive/root:/"),b.v+=this.g.N.concat("/")):b.v+="/drive/root:/";b.v+=this.g.F;b.v+=":/createUploadSession";var e={"@microsoft.graph.conflictBehavior":"replace"},d=this.g.F.lastIndexOf("/");e.name=0<=d?this.g.F.slice(d+1):this.g.F;b.aa=JSON.stringify({item:e});this.u.i(b)};this.write=function(b,a){var e=new Blob([new Uint8Array(b)],{type:"application/octet-binary"}),d="bytes "+this.h+"-";this.h+=e.size;d+=this.h-1+"/"+this.l;var h=0,k=function(){var l=new XMLHttpRequest;l.open("PUT",this.j,
!0);l.setRequestHeader("Content-Range",d);l.onload=function(m){e=b=null;m=m.target;4==m.readyState&&(200<=m.status&&299>=m.status?a&&a(m.responseText):alert(m.responseText+" ("+m.status+")"))}.bind(this);l.onerror=function(){1>h?(h++,setTimeout(function(){k()},500)):e=b=null};l.send(e)}.bind(this);k()};this.cancel=function(b){var a=new XMLHttpRequest;a.open("DELETE",this.j,!0);a.onload=function(e){e=e.target;if(4==e.readyState){var d={H:e.status,K:e.responseText};200<=e.status&&299>=e.status?b&&b(!1,
d):(console.log(e.responseText+" ("+e.status+")"),b&&b(d))}}.bind(this);a.send()};this.o=function(){return this.l}}
function B(c,f){this.A=f;this.L=c;this.url="";this.name=null;this.s=this.i=this.g=this.size=0;this.U=!1;this.J=16E3;c.G&&(this.J=c.G);this.j=0;this.m=null;this.B=function(b,a){if(this.U){this.i&&(this.s=this.i,this.i=0);if(b){if(b>=this.h())throw console.log("offset:"+b+",size:"+this.h()),Error("offset can not be bigger than input size.");this.g=b}else this.g=0;a&&a()}else this.A.i({v:"/me/drive/items/"+this.L.ca,P:"GET",D:this.L.D,M:function(e){this.U=!0;if(200!=e.H)throw Error(e.K+" ("+e.H+")");
e=JSON.parse(e.K);this.size=e.size;if(b){if(b>=this.h())throw Error("offset can not be bigger than input size.");this.g=b}this.url=e["@microsoft.graph.downloadUrl"];this.name=e.name;a&&a()}.bind(this)})};this.o=function(){return this.g};this.h=function(){return this.size};this.u=function(){return this.g>=this.h()};this.l=function(b){b||(b=this.J);this.I(b)};this.T=function(){};this.I=function(b){if(!b||!this.i){if(b)this.i=b;else if(this.i)b=this.i;else throw Error("size must be specified.");if(!this.s){var a=
this.g+b-1,e=function(){var d=new XMLHttpRequest;10<=this.j?(d.open("GET",this.A.j,!0),d.setRequestHeader("Zb-Url",this.url)):d.open("GET",this.url,!0);(0<this.g||a<this.size-1)&&d.setRequestHeader("Range","bytes="+this.g+"-"+a);d.responseType="arraybuffer";d.onload=function(h){if(this.s)this.s=0,this.i&&this.I();else if(this.i=0,h=h.target,4==h.readyState)if(this.j=10>this.j?1:11,200==h.status||206==h.status){var k=parseInt(h.getResponseHeader("content-length"),10);if(k)this.g+=k;else{if(k=h.getResponseHeader("content-range")){var l=
k.indexOf("-");if(0>l)k=0;else{l++;var m=k.indexOf("/",l);k=m<=l?0:parseInt(k.slice(l,m),10)}}else k=0;this.g=k?k+1:a+1}200==h.status&&this.g<this.h()?this.g=this.h():this.g>this.h()&&(this.g=this.h());this.m&&this.m(h.response,this);h.response=null}else throw Error(h.responseText+" ("+h.status+")");}.bind(this);d.onerror=function(){if(0==this.j&&this.A.j)this.j=10,e();else if(1==this.j||11==this.j)this.j++,setTimeout(function(){e()},500)}.bind(this);d.send()}.bind(this);e()}}}}var z="onedrive";var D={};(function(c){c[z]={ka:"Microsoft OneDrive",da:function(f,b,a){return new y(f,b,a)},ja:function(f){return f&&f.state==z?!0:!1}}})(D);window=self;self.g=!1;function E(c,f){var b=new x;b.A(function(a){a&&console.error("IndexedDB is not supported in your browser settings.");(a=D[c._drvnm])?(a=a.da(b,"https://zgayard.f5.si/grantauth.php","https://zgayard.f5.si/relay.php"),a.s(c._token),f(a)):self.postMessage({_type:2,_wtype:self._wtype,_size:0,_err:"Drive's name is invalid."})})}
function F(c){self._wtype=c._type;var f=c._cominf;self.C={iv:CryptoJS.enc.Base64url.parse(f._iv),key:CryptoJS.enc.Base64url.parse(f._key)};self.postMessage({_type:0,_wtype:self._wtype,_size:0});E(f,function(b){switch(c._type){case 1:G(b.Z({ca:c._downinf._targetId,G:16E5}),new u,!0);break;case 2:var a=c._upinf,e=a._file,d=a._baseId,h=a._basePath;a=a._fpath.split("/");if(f._encfname)for(var k=0;k<a.length;k++){var l=k,m=self.C;var p=CryptoJS.enc.Utf8.parse(a[k]);var n=m;"string"==typeof m&&(n=r(m));
if(!(n&&n.iv&&n.key))throw Error("Need iv and key. They can be generated by CryptoJS.kdf.OpenSSL.execute from password and salt.");m={mode:CryptoJS.mode.CBC,padding:CryptoJS.pad.Pkcs7};Object.assign(m,n);n=CryptoJS.algo.AES.createEncryptor(m.key,m);p=n.process(p);p.concat(n.finalize());p.clamp();p=p.toString(CryptoJS.enc.Base64url);a[l]=p}e=new v({_blob:e,G:16E5});d={F:a[0],V:d};1<a.length&&(d.F=a.join("/"),d.N=h);b=b.$(d);G(e,b)}})}
function G(c,f,b){var a=new w({ba:b,C:self.C,W:c,X:f});a.A=function(){var e={_type:1,_wtype:self._wtype,_speed:a.J(),_pos:c.o(),_size:c.h()};self.postMessage(e);return self.g?!1:!0};a.o=function(e,d){var h={_type:2,_wtype:self._wtype,_size:f.o()};e?h._err=e.message||e.la:d?h._type=3:f.i&&(h._blob=f.i());self.postMessage(h)};a.start()}self.addEventListener("message",function(c){c=c.data;switch(c._type){case 1:case 2:F(c);break;default:self.g=!0}});

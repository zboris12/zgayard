var h;function q(d){function e(b){return d.next(b)}function a(b){return d.throw(b)}return new Promise(function(b,c){function f(g){g.done?b(g.value):Promise.resolve(g.value).then(e,a).then(f,c)}f(d.next())})}function u(d){return q(d())};function x(d){if(!d)return null;var e=d.charAt(0);if("?"==e||"#"==e)d=d.substring(1);var a={};d.split("&").forEach(function(b){var c=b.indexOf("=");0>c?a[decodeURIComponent(b)]="":a[decodeURIComponent(b.substring(0,c))]=decodeURIComponent(b.substring(c+1))});return a}function y(d,e){var a="",b;for(b in d)a=e?a+("&"+b+"="+d[b]):a+("&"+encodeURIComponent(b)+"="+encodeURIComponent(d[b]));return a?"?".concat(a.substring(1)):a}function z(){return new Promise(function(d){setTimeout(d,500)})};function A(){var d=new FileReader;d.addEventListener("load",function(e){e.target.h&&e.target.h(e.target.result)});d.addEventListener("error",function(e){e.target.g&&e.target.g(e.target.error)});return d}FileReader.prototype.h=void 0;FileReader.prototype.g=void 0;function B(d,e){return new Promise(function(a,b){d.h=a;d.g=b;d.readAsArrayBuffer(e)})}function C(d){d=d.replace(/-/g,"+").replace(/_/g,"/");var e=d.length%4;0<e&&(d+="====".slice(e));return d}
function D(d){for(var e=new Uint8Array(d.length),a=0;a<d.length;a++)e[a]=d.charCodeAt(a);return e}function E(d){var e=forge.md.md5.create();e.update(d);e=e.digest().getBytes();for(var a=forge.md.md5.create(),b=new forge.util.ByteBuffer,c="";48>b.length();)a.start(),c&&a.update(c),a.update(d),a.update(e),c=a.digest().getBytes(),b.putBytes(c);b.truncate(b.length()-48);return{key:b.getBytes(32),iv:b.getBytes()}}
function F(){this.h=0;this.g=null;this.j=function(d){const e=this;return u(function*(){e.h=d})};this.write=function(d){const e=this;return u(function*(){e.g||(e.g=[]);e.g.push(d);d=null})};this.cancel=function(){return u(function*(){})};this.i=function(){if(this.g&&0<this.g.length&&(this.g[0]instanceof ArrayBuffer||this.g[0]instanceof Uint8Array)){for(var d=0,e=0;e<this.g.length;e++)d+=this.g[e].byteLength;d=new Uint8Array(d);var a=0;for(e=0;e<this.g.length;++e){var b=this.g[e];b instanceof ArrayBuffer&&
(b=new Uint8Array(b));d.set(b,a);a+=b.byteLength}return d}return null};this.A=function(){var d=this.i();d instanceof Uint8Array||(d=new Uint8Array(d));return new Blob([d],{type:"application/octet-binary"})};this.download=function(d){var e=this.A();if(window.navigator.msSaveBlob)window.navigator.msSaveBlob(e,d);else throw Error("Element for download is not specified.");};this.u=function(){return this.h}}
function G(d){this.blob=null;if(d.ma)if(d.ma instanceof Blob)this.blob=d.ma;else throw Error("blob is not a Blob.");else throw Error("blob must be specified.");this.j=1600;d.N&&(this.j=d.N);this.h=0;this.i=null;this.J=function(e){const a=this;return u(function*(){if(e){if(e>=a.g())throw Error("offset can not be bigger than input size.");a.h=e}else a.h=0;a.i=A()})};this.V=function(){return this.j};this.l=function(){return this.h};this.g=function(){return this.blob.size};this.A=function(){return this.h>=
this.g()};this.K=function(e){const a=this;return u(function*(){if(1==a.i.readyState)return null;var b=a.h;a.h=e?a.h+e:a.h+a.j;return yield B(a.i,a.blob.slice(b,a.h))})};this.F=function(){this.blob=this.i=null}}
function H(d){this.m=!0;this.g=d.Ea;this.iv=this.key="";this.l=null;this.h="";this.j=this.i=0;d.Ca&&(this.m=!1);if(!this.g)throw Error("reader must be specified.");if(d.da)d="string"==typeof d.da?E(d.da):d.da,this.key=d.key,this.iv=d.iv;else throw Error("keycfg must be specified.");this.K=function(){const e=this;return u(function*(){if(e.j)return e.j;if(e.m)return e.j=16*Math.ceil((e.g.g()+1)/16),e.j;0==e.g.g()&&(yield e.o());var a=e.g.g()-16,b=yield e.F(a);e.j=a+b.length;return e.j})};this.o=function(e){const a=
this;return u(function*(){var b=e||0;if(e){if(a.m)throw Error("Can NOT set offset for encryption.");e-=e%16+16;0>e&&(e=0)}yield a.g.J(e);var c=a.iv;b&&(c=(yield a.A(16)).getBytes());var f=new forge.util.ByteBuffer(a.key);a.l=a.m?forge.cipher.createCipher("AES-CBC",f):forge.cipher.createDecipher("AES-CBC",f);a.l.start({iv:c});a.i=b;a.h=""})};this.F=function(e){const a=this;return u(function*(){var b=a.g.V(),c="",f=0<=e?e:a.g.l();if(a.i==f&&a.h){if(b<=a.h.length)return a.i+=b,c=a.h.substring(0,b),a.h=
a.h.substring(b),c;c=a.h;f+=a.h.length;a.i+=a.h.length;b-=a.h.length}var g=16*Math.ceil((f%16+b)/16);a.l&&a.i==f||(yield a.o(f));var k=yield a.A(g);g=k.length();a.l.update(k);a.g.A()&&a.l.finish();k=a.l.output.getBytes();f<a.g.l()?(f-=a.g.l()-g,0<f&&(k=k.substring(f)),k.length>b&&(a.h=k.substring(b),k=k.substring(0,b)),a.i+=b):k="";c?k&&(c=c.concat(k)):k&&(c=k);return c})};this.u=function(){return this.g.l()};this.v=function(){return this.g.A()};this.J=function(){this.g.F();this.l=this.g=null};this.A=
function(e){const a=this;return u(function*(){var b=yield a.g.K(e);return new forge.util.ByteBuffer(b)})}}
function J(d){this.g=new H(d);this.h=d.Ga;this.speed=this.l=this.i=0;if(!this.h)throw Error("writer must be specified.");this.start=function(e,a){const b=this;return u(function*(){var c=e||0,f=yield b.g.K();yield b.h.j(f);yield b.g.o(e);b.i=Date.now()+1E3;b.l=c;for(c=b.g.v()?2:0;0==c;)(f=yield b.g.F())&&(yield b.h.write(D(f))),b.g.v()?c=2:a&&!a()&&(c=1);1==c&&(yield b.h.cancel());b.h=null;b.g.J();b.g=null;return 2==c})};this.j=function(){Date.now()>this.i&&(this.speed=1E3*(this.g.u()-this.l)/(Date.now()-
this.i+1E3),this.i=Date.now()+1E3,this.l=this.g.u());return this.speed}};function K(){this.h=!0;this.g=null;this.l=this.V=!1;this.K=function(){var d=null;if(this.h)try{d=window.sessionStorage.getItem("login_state")}catch(e){this.h=!1,console.error(e)}return d};this.A=function(d){var e=this.K();return e&&d==e?!0:!1};this.i=function(d,e){if(this.h)try{return window.sessionStorage.setItem(d,e.toString()),!0}catch(a){this.h=!1,console.error(a)}return!1};this.m=function(d){if(this.h)try{window.sessionStorage.removeItem(d)}catch(e){this.h=!1,console.error(e)}};this.F=function(){var d=
this.j("relay_url");return d?d:""};this.J=function(){var d=null,e=this.u("extra_info");e&&(d=JSON.parse(e));return d&&2==d.length?{ua:d[0],ca:d[1]}:null};this.v=function(d){d?(d="string"===typeof d?d:JSON.stringify([d.ua,d.ca]),this.i("drive_extra",d),this.o("extra_info",d)):(this.m("drive_extra"),this.o("extra_info",null))};this.G=function(){var d=this;return new Promise(function(e,a){if(window.indexedDB){var b=window.indexedDB.open("zgayard1946");b.onerror=function(c){a(c.target.error)};b.onupgradeneeded=
function(c){c.target.result.createObjectStore("settings",{keyPath:"key"})};b.onsuccess=function(c){var f=c.target.result;c=f.transaction("settings","readwrite");c.oncomplete=function(){f.close();e()};c.objectStore("settings").getAll().onsuccess=function(g){d.g={};g.target.result.forEach(function(k){d.g[k.key]=k.value});g=d.g.drive;d.l=g&&d.g[g]&&d.g[g].refresh_token?!0:!1}}}else a(Error("IndexedDB is not supported in your browser settings."))})};this.u=function(d){var e=this.j("drive");return e&&
(e=this.g[e])?e[d]:null};this.o=function(d,e){const a=this;u(function*(){if(a.g){var b=a.j("drive");if(e)a.g[b]||(a.g[b]={}),a.g[b][d]=e;else if(a.g[b]&&a.g[b][d])delete a.g[b][d];else return;a.V=!0}})};this.P=function(d){return new Promise(function(e,a){var b=window.indexedDB.open("zgayard1946");b.onerror=function(c){a(c.target.error)};b.onsuccess=function(c){var f=c.target.result;c=f.transaction("settings","readwrite");c.oncomplete=function(){f.close();e()};c=c.objectStore("settings");d&&d(c)}})};
this.j=function(d){return this.g&&this.g[d]?this.g[d]:null};this.saveData=function(d,e){const a=this;return u(function*(){a.g&&(a.g[d]=e);yield a.P(function(b){b.put({key:d,value:e})})})}};var L={};function M(d,e,a){this.s=d;this.I=e;this.g=a}function N(d,e){this.o=null;this.u=e;this.h=null;this.g=d;this.U||(this.U=function(){})}function O(d){null==d.o&&(d.o=d.g.F());return d.o}
function P(d,e){return u(function*(){var a="POST",b=d.l().concat(encodeURI(e.L)),c=new Headers;if(e&&e.B)c.append("Authorization",e.B);else if(e&&e.ha){var f="Bearer";e&&e.ia&&(f=e.ia);c.append("Authorization",f+" "+e.ha)}else c.append("Authorization",d.h);if(e&&e.oa)for(var g of e.oa.entries())c.append(g[0],g[1]);e&&e.fa&&(a=e.fa);a=yield fetch(b,{method:a,body:e.va,headers:c,redirect:"follow"});401==a.status&&d.g.l&&!e.Fa&&(a=yield aa(d,e));return a})}h=N.prototype;
h.qa=function(){const d=this;return u(function*(){var e=d.g.l,a={},b,c=x(window.location.search);(b=x(window.location.hash))&&(c=c?Object.assign(c,b):b);if((b=c)&&b.token_type&&b.access_token){d.h=b.token_type+" "+b.access_token;d.g.i("access_token",d.h);if(b&&b.state)if(d.g.A(b.state))d.g.m("login_state");else return"Unauthorized access to this url.";return null}b&&b.code?a.code=b.code:e&&(a.ra=d.g.u("refresh_token"));if(c=d.g.J())a.clientId=c.ua,a.ya=c.ca;if(a.code||a.ra){if(b&&b.state)if(d.g.A(b.state))d.g.m("login_state");
else return"Unauthorized access to this url.";if((a=yield Q(d,a))&&a.token_type&&a.access_token)return c&&a.client_secret_enc&&(c.ca=a.client_secret_enc,d.g.v(c)),d.h=a.token_type+" "+a.access_token,d.g.i("access_token",d.h),e&&a.refresh_token&&d.g.o("refresh_token",a.refresh_token),a.logout&&d.g.i("logout_url",a.logout),null}else if(e&&(a.Aa=!0),(a=yield Q(d,a))&&a.url)return c&&a.client_secret_enc&&(c.ca=a.client_secret_enc,d.g.v(c)),a.state&&(d.g.i("login_state",a.state)||(a.state=d.j())),a.logout&&
d.g.i("logout_url",a.logout),window.location.href=a.url.concat("&state=".concat(encodeURIComponent(a.state))),"redirect";return a&&a.error?"["+a.error+"] "+a.error_description:"Unknown error occured when doing authorization."})};h.ka=function(){return u(function*(){})};h.W=function(){return u(function*(){})};h.ba=function(){return u(function*(){})};h.$=function(){return u(function*(){})};h.ja=function(){return u(function*(){})};h.pa=function(){return u(function*(){})};
h.ta=function(d){return new ba(d,this)};h.Z=function(){return u(function*(){})};h.Ba=function(){};h.sa=function(d){return new ca(d,this)};function R(d){return u(function*(){return{xa:d.status,ga:yield d.text()}})}function S(d,e,a,b,c){return u(function*(){var f={L:e,fa:a};T(c,f);f=yield P(d,f);var g=yield R(f);if(b&&f.status!=b)throw Error(JSON.stringify(g));return g})}function U(d,e,a){return u(function*(){return(yield S(d,e,"GET",200,a)).ga})}
function T(d,e){d.ia&&(e.ia=d.ia);d.ha&&(e.ha=d.ha);d.B&&(e.B=d.B)}
function Q(d,e){return u(function*(){if(!e)throw Error("Options are not specified when auth onedrive.");var a=new FormData;a.append("drive_type",d.j());e.clientId&&a.append("client_id",e.clientId);e.Ja&&a.append("redirect_uri",e.Ja);e.ya&&a.append("client_secret",e.ya);e.code?a.append("code",e.code):e.ra?a.append("refresh_token",e.ra):e.Aa&&a.append("need_code",e.Aa);a=yield fetch(d.u,{method:"POST",body:a,credentials:"include",redirect:"follow"});if(200==a.status)return yield a.json();var b=yield a.text();
throw Error(b+" ("+a.status+")");})}function aa(d,e){return u(function*(){console.log("Retry to send ajax.");if(e)e.Fa=!0;else return null;var a=yield d.qa();if(a)return console.error(a),null;e.B=d.h;return yield P(d,e)})}h.za=function(d){return d.ok};
function da(d){d.la=N;if("function"===typeof Object.create)d.prototype=Object.create(N.prototype,{constructor:{value:d,enumerable:!1,writable:!0,configurable:!0}});else{var e=function(){};e.prototype=N.prototype;d.prototype=new e;d.prototype.constructor=d}d.prototype.Ia||(d.prototype.Ia=function(){return this.constructor.la});d.prototype.U||(d.prototype.U=function(...a){return this.constructor.la.call(this,...a)});d.prototype.Ka||(d.prototype.Ka=function(a,...b){return a?this.constructor.la.prototype[a].call(this,
...b):this.constructor.la.call(this,...b)})}function V(d,e,a){da(a);L[d]=new M(d,e,a)}var W=-1,X=-9,Y=0;
function ba(d,e){this.m=e;this.o=d;this.v="";this.g=this.l=0;this.h=null;if(!this.o||!this.o.S)throw Error("fnm is not specified.");this.j=function(a){const b=this;return u(function*(){b.l=a;b.v=yield b.m.$(b.o,a)})};this.write=function(a){const b=this;return u(function*(){var c=null;if(b.h){var f=b.h.byteLength;0<f?(c=new Uint8Array(f+a.byteLength),c.set(b.i(b.h),0),c.set(b.i(a),f)):c=b.i(a);b.h=null}else c=b.i(a);var g=new Blob([c],{type:"application/octet-binary"}),k="bytes "+b.g+"-";b.g+=g.size;
k+=b.g-1+"/"+b.l;var l=0,m=function(){const n=this;return u(function*(){var p=new Headers;p.append("Content-Range",k);try{var r=yield fetch(n.v,{method:"PUT",headers:p,body:g,redirect:"follow"});p="";if(e.za(r)){var t=yield n.m.ja(r);if(t==X)throw a=null,p=yield r.text(),Error(p+" ("+r.status+")");if(t!=W&&t!=Y&&t<n.g){var v=a.byteLength;v-=n.g-t;if(0<v){var w=a.slice(v);a=null;n.g>=n.l?yield n.write(w):(n.h=w,n.g=t)}else throw a=null,Error("Can NOT continue to upload buffer.");}}else throw a=null,
p=yield r.text(),Error(p+" ("+r.status+")");}catch(I){if(1>l)l++,yield z(),yield m();else throw g=a=null,I;}})}.bind(b);yield m()})};this.cancel=function(){const a=this;return u(function*(){yield a.m.pa(a.v)})};this.u=function(){return this.l};this.i=function(a){return a instanceof Uint8Array?a:new Uint8Array(a)}}
function ca(d,e){this.m=e;this.u=d;this.url="";this.name=null;this.v=this.i=this.h=this.size=0;this.aa=!1;this.G=16E3;d.N&&(this.G=d.N);this.o=this.j=0;this.J=function(a){const b=this;return u(function*(){if(b.aa)if(b.i&&(b.v=b.i,b.i=0),a){if(a>=b.g())throw console.log("offset:"+a+",size:"+b.g()),Error("offset can not be bigger than input size.");b.h=a}else b.h=0;else{var c=yield b.m.Z(b.u);b.aa=!0;if(c){if(b.size=c.C||0,b.url=c.s,b.name=c.I,b.o="1"==c.D?1:0,a){if(a>=b.g())throw Error("offset can not be bigger than input size.");
b.h=a}}else throw Error("Failed to prepare reader.");}})};this.V=function(){return this.G};this.l=function(){return this.h};this.g=function(){return this.size};this.A=function(){return this.h>=this.g()};this.K=function(a){const b=this;return u(function*(){a||(a=b.G);return yield b.P(a)})};this.F=function(){};this.P=function(a){const b=this;return u(function*(){if(a&&b.i)return null;if(a)b.i=a;else if(b.i)a=b.i;else throw Error("size must be specified.");if(b.v)return null;var c=b.h+a-1,f=function(){const g=
this;return u(function*(){var k=g.url,l=new Headers;10<=g.j&&(k=O(g.m),l.append("Zb-Url",g.url));g.m.Ba(l,g.u.B);l.append("Range","bytes="+g.h+"-"+c);try{var m=yield fetch(k,{method:"GET",headers:l,redirect:"follow"});if(g.v){if(g.v=0,g.i)return yield g.P()}else{g.i=0;g.j=10>g.j?1:11;if(200==m.status||206==m.status){2==g.o&&(g.o=1);var n=parseInt(m.headers.get("content-length"),10);if(n)g.h+=n;else{var p=m.headers.get("content-range");if(p){var r=p.indexOf("-");if(0>r)var t=0;else{r++;var v=p.indexOf("/",
r);t=v<=r?0:parseInt(p.slice(r,v),10)}}else t=0;g.h=t?t+1:c+1}200==m.status&&g.h<g.g()?g.h=g.g():g.h>g.g()&&(g.h=g.g());return yield m.arrayBuffer()}if(401==m.status&&1==g.o){console.log("Retry auth.");g.o=2;var w=yield g.m.qa();if(w)console.error(w);else return g.u.B&&delete g.u.B,yield f()}else{var I=yield m.text();throw Error(I+" ("+m.status+")");}}}catch(ea){if(0==g.j&&O(g.m))return g.j=10,yield f();if(1==g.j||11==g.j)return g.j++,yield z(),yield f();throw ea;}})}.bind(b);return yield f()})}}
;V("onedrive","Microsoft OneDrive",function(d,e){this.U(d,e);this.j=function(){return"onedrive"};this.ka=function(a){const b=this;return u(function*(){var c="/me/drive/root/children";if(a){if(a.R){c=function(k){const l=this;return u(function*(){var m={T:""};T(a,m);m=yield l.i(m,k);var n=[];m&&n.push(m);return n})}.bind(b);if(a.O){var f={T:a.O};T(a,f);if(f=yield b.i(f))return yield c(f.Da.concat("/").concat(f.I).concat("/").concat(a.R))}else return yield c("/drive/root:/".concat(a.R));return null}a.O&&
(c="/me/drive/items/"+a.O+"/children")}c=yield U(b,c.concat(y({select:"id,name,parentReference,lastModifiedDateTime,size,folder,file"},!0)),a);var g=[];c&&JSON.parse(c).value.forEach(function(k){g.push(this.Y(k))},b);return g})};this.W=function(a){const b=this;return u(function*(){return yield b.i(a)})};this.ba=function(a){const b=this;return u(function*(){var c="/me/drive/items/".concat(a.X);yield S(b,c,"DELETE",204,a);return 0})};this.$=function(a){const b=this;return u(function*(){var c={L:"/me",
fa:"POST",B:a.B,oa:new Headers({"Content-Type":"application/json;charset=UTF-8","Cache-Control":"no-cache",Pragma:"no-cache"})};c.L=a.H?"/me/drive/items/"+a.H+":/":c.L+"/drive/root:/";c.L+=a.S;c.L+=":/createUploadSession";c.va=JSON.stringify({item:{"@microsoft.graph.conflictBehavior":"replace",name:a.S}});c=yield P(b,c);var f=yield R(c),g="";c.ok&&(g=JSON.parse(f.ga).uploadUrl);return g})};this.ja=function(a){return u(function*(){if(0<=[200,201].indexOf(a.status))return W;if(0>[202].indexOf(a.status))return X;
var b=yield a.text();if((b=JSON.parse(b).nextExpectedRanges)&&b.length){var c=b[0].indexOf("-");if(0<c)return parseInt(b[0].substring(0,c),10)}return Y})};this.pa=function(a){return u(function*(){var b=yield fetch(a,{method:"DELETE",redirect:"follow"});if(!b.ok)throw(yield b.text())+" ("+b.status+")";})};this.Z=function(a){const b=this;return u(function*(){var c="/me/drive/items/".concat(a.s),f={};a.B&&(f.B=a.B);c=yield U(b,c.concat(y({select:"name,size,@microsoft.graph.downloadUrl"},!0)),f);f=null;
c&&(c=JSON.parse(c),f={s:c["@microsoft.graph.downloadUrl"],I:c.name,C:c.size});return f})};this.l=function(){return"https://graph.microsoft.com/v1.0"};this.i=function(a,b){const c=this;return u(function*(){var f=b?b.startsWith("/me")?b:"/me".concat(b):"/me/drive/items/"+a.T;f=yield S(c,f.concat(y({select:"id,name,parentReference,lastModifiedDateTime,size,folder,file"},!0)),"GET",0,a);if(200==f.xa)return c.Y(JSON.parse(f.ga));if(404==f.xa&&b)return null;throw Error(JSON.stringify(f));})};this.Y=function(a){var b=
{s:a.id,I:a.name,C:a.size,ea:a.lastModifiedDateTime,Da:a.parentReference.path,M:a.parentReference.id,D:"0"};a.folder?b.D="1":a.file&&(b.D="2");return b}});V("googledrive","Google Drive",function(d,e){this.U(d,e);this.j=function(){return"googledrive"};this.ka=function(a){const b=this;return u(function*(){var c=b.i("/files"),f="'"+(a.O?a.O:"root")+"' in parents";a.R&&(f=f.concat(" and name = '"+a.R+"'"));c=yield U(b,c.concat(y({fields:"files(id,name,mimeType,parents,modifiedTime,size)",q:f},!0)),a);var g=[];JSON.parse(c).files.forEach(function(k){g.push(this.Y(k))},b);return g})};this.W=function(a){const b=this;return u(function*(){var c=b.i("/files/").concat(a.T);
c=yield U(b,c.concat(y({fields:"id,name,mimeType,parents,modifiedTime,size"},!0)),a);return b.Y(JSON.parse(c))})};this.ba=function(a){const b=this;return u(function*(){var c=b.i("/files/").concat(a.X);yield S(b,c,"DELETE",204,a);return 0})};this.$=function(a,b){const c=this;return u(function*(){var f={R:a.S,B:a.B};a.H&&(f.O=a.H);f=yield c.ka(f);return 0<f.length?yield c.m(a,b,f[0].s):yield c.m(a,b)})};this.ja=function(a){return u(function*(){if(0<=[200,201].indexOf(a.status))return W;if(0>[308].indexOf(a.status))return X;
var b=a.headers.get("range");if(b){var c=b.indexOf("-");if(0<c)return parseInt(b.slice(c+1),10)+1}return Y})};this.Z=function(a){const b=this;return u(function*(){var c=b.i("/files/").concat(a.s),f={T:a.s};a.B&&(f.B=a.B);if(f=yield b.W(f))f.s=b.l().concat(encodeURI(c)).concat(y({alt:"media"})),b.g.l&&(f.D="1");return f})};this.Ba=function(a,b){b?a.append("Authorization",b):a.append("Authorization",this.h?this.h:"")};this.za=function(a){return a.ok||308==a.status};this.l=function(){return"https://www.googleapis.com"};
this.m=function(a,b,c){const f=this;return u(function*(){var g={},k="POST",l="/files?uploadType=resumable";c?(k="PATCH",l="/files/"+c+"?uploadType=resumable"):(g.name=a.S,a.H&&(g.parents=[a.H]));g={L:"/upload".concat(f.i(l)),fa:k,B:a.B,oa:new Headers({"X-Upload-Content-Length":b,"X-Upload-Content-Type":"application/octet-stream","Content-Type":"application/json; charset=UTF-8"}),va:JSON.stringify(g)};g=yield P(f,g);if(g.ok)return g.headers.get("location")||"";g=yield R(g);throw Error(g.ga);})};this.i=
function(a){return"/drive/v3".concat(a)};this.Y=function(a){var b={s:a.id,I:a.name,C:a.size,ea:a.modifiedTime,D:"2"};a.parents&&0<a.parents.length&&(b.M=a.parents[0]);this.A(a.mimeType)&&(b.D="1");return b};this.A=function(a){return"application/vnd.google-apps.folder"==a}});function fa(d,e){this.v=e;this.G=d;this.h=null;this.i=this.size=0;this.j="";this.u=this.m=0;this.o=1600;d.N&&(this.o=d.N);this.J=function(a){const b=this;return u(function*(){var c=yield b.v.Z(b.G);if(c)b.size=c.C||0,c=yield b.v.F(b.G.s),b.h=c,b.h.sort(function(f,g){return f.wa-g.wa}),b.P(a);else throw Error("Failed to prepare reader.");})};this.V=function(){return this.o};this.l=function(){return this.i};this.g=function(){return this.size};this.A=function(){return this.h?this.m>=this.h.length:!0};
this.K=function(a){const b=this;return u(function*(){if(!b.j){var c=yield b.v.v(b.h[b.m].s);b.j=window.atob(C(c))}return yield b.aa(a)})};this.F=function(){this.h=null;this.j=""};this.P=function(a){if(a){if(a>=this.g())throw Error("offset can not be bigger than input size.");this.i=a;var b=0;for(a=0;a<this.h.length&&!(b+=this.h[a].C,this.i<b);a++)this.u=b;if(a<this.h.length)this.m=a;else throw Error("offset can not be bigger than input size.");}else this.m=this.u=this.i=0;this.j=""};this.aa=function(a){const b=
this;return u(function*(){var c=b.i-b.u,f=b.j.length-c;a?a<f&&(f=a):b.o<f&&(f=b.o);var g=D(b.j.substring(c,c+f));b.i+=f;b.j.length==c+f&&(b.j="",b.m++,b.u=b.i);return g.buffer})}}
function ha(d,e){this.g=e;this.h=d;this.data={s:"",I:"",C:0,M:"",D:"2"};this.l=this.i=0;this.j=function(a){const b=this;return u(function*(){b.i=a;b.data.I=b.h.S;b.h.H&&(b.data.M=b.h.H);b.data.s=yield b.g.$(b.h,a)})};this.write=function(a){const b=this;return u(function*(){b.data.C+=a.byteLength;for(var c=b.m(a),f="",g=0;g<c.length;)f+=String.fromCharCode(c[g]),g++;c=window.btoa(f).replace(/\+/g,"-").replace(/\//g,"_").replace(/=*$/g,"");b.l++;yield b.g.saveData(b.data.s,b.l,a.byteLength,c);b.data.C>=
b.i&&(yield b.g.G(b.data))})};this.cancel=function(){const a=this;return u(function*(){yield a.g.ba({X:a.data.s})})};this.u=function(){return this.i};this.m=function(a){return a instanceof Uint8Array?a:new Uint8Array(a)}}
V("idxdb","Loacal Indexed DB",function(d,e){this.U(d,e);this.j=function(){return"idxdb"};this.qa=function(){return new Promise(function(){this.Ha()})};this.ka=function(a){const b=this;return u(function*(){return yield b.A(void 0,a.O,a.R)})};this.W=function(a){const b=this;return u(function*(){var c=yield b.A(a.T);return c&&0<c.length?c[0]:null})};this.ba=function(a){const b=this;return u(function*(){function c(k){var l;for(l=0;l<f.length;l++)f[l].s==k?f[l].na=!0:f[l].M==k&&("1"==f[l].D?c(f[l].s):
f[l].na=!0)}var f=[],g=0;yield b.i(function(k){k.getAll().onsuccess=function(l){l.target.result.forEach(function(m){f.push({s:m.key,I:"",M:m.pid})})}});c(a.X);yield b.i(function(k){f.forEach(function(l){l.na&&k.delete(l.s)})});yield b.m(function(k){var l=[];f.forEach(function(m){m.na&&"2"==m.D&&l.push(m.s)});0>l.indexOf(a.X)&&l.push(a.X);k.getAllKeys().onsuccess=function(m){m.target.result.forEach(function(n){var p=n.indexOf(":");0<=l.indexOf(n.substring(0,p))&&(k.delete(n),g+=parseInt(n.substring(n.indexOf("_",
p+1)+1),10))})}});return g})};this.ta=function(a){return new ha(a,this)};this.$=function(a){const b=this;return u(function*(){var c="";a.H&&(c=a.H);return yield b.J(c)})};this.ja=function(){return u(function*(){return Y})};this.pa=function(){return u(function*(){})};this.sa=function(a){return new fa(a,this)};this.Z=function(a){const b=this;return u(function*(){return yield b.W({T:a.s})})};this.l=function(){return""};this.G=function(a){const b=this;return u(function*(){a.ea=b.K();var c={key:a.s,name:a.I,
size:a.C,tms:a.ea,type:a.D};a.M&&(c.pid=a.M);yield b.i(function(f){f.put(c)})})};this.saveData=function(a,b,c,f){const g=this;return u(function*(){yield g.m(function(k){k.put({key:a+":"+b+"_"+c,data:f})})})};this.F=function(a){const b=this;return u(function*(){var c=[];yield b.m(function(f){f.getAllKeys().onsuccess=function(g){g.target.result.forEach(function(k){var l=k.indexOf(":");if(k.substring(0,l)==a){var m=k.substring(l+1);l=m.indexOf("_");c.push({s:k,wa:parseInt(m.substring(0,l),10),C:parseInt(m.substring(l+
1),10)})}})}});return c})};this.v=function(a){const b=this;return u(function*(){var c="";yield b.m(function(f){f.get(a).onsuccess=function(g){c=g.target.result.data}});return c})};this.Ha=function(){new Promise(function(a,b){if(window.indexedDB){var c=window.indexedDB.open("zgalocaldb");c.onerror=function(f){b(f.target.error)};c.onupgradeneeded=function(f){f=f.target.result;f.createObjectStore("items",{keyPath:"key"});f.createObjectStore("datas",{keyPath:"key"})};c.onsuccess=function(f){f.target.result.close();
a()}}else b(Error("IndexedDB is not supported in your browser settings."))})};this.i=function(a){return new Promise(function(b){window.indexedDB.open("zgalocaldb").onsuccess=function(c){var f=c.target.result;c=f.transaction("items","readwrite");c.oncomplete=function(){f.close();b()}.bind(this);c=c.objectStore("items");a&&a(c)}.bind(this)})};this.m=function(a){return new Promise(function(b){window.indexedDB.open("zgalocaldb").onsuccess=function(c){var f=c.target.result;c=f.transaction("datas","readwrite");
c.oncomplete=function(){f.close();b()}.bind(this);c=c.objectStore("datas");a&&a(c)}.bind(this)}.bind(this))};this.A=function(a,b,c){const f=this;return u(function*(){var g=[];yield f.i(function(k){k.getAll().onsuccess=function(l){l.target.result.forEach(function(m){var n=!0;a&&(n=a==m.key);n&&b&&(n=b==m.pid);n&&c&&(n=c==m.name);n&&g.push({s:m.key,I:m.name,C:m.size,ea:m.tms,D:m.type,M:m.pid})})}});return g})};this.K=function(){var a;a||(a=new Date);var b=[],c=[];b.push(a.getFullYear());b.push(a.getMonth()+
1);b.push(a.getDate());c.push("0".concat(a.getHours()).slice(-2));c.push("0".concat(a.getMinutes()).slice(-2));c.push("0".concat(a.getSeconds()).slice(-2));return b.join("-")+" "+c.join(":")};this.J=function(a){const b=this;return u(function*(){var c=-1;yield b.i(function(f){f.getAllKeys().onsuccess=function(g){g.target.result.forEach(function(k){var l=k.indexOf("_");a&&0<l?k.substring(l+1)==a&&(l=parseInt(k.substring(0,l),10),l>c&&(c=l)):!a&&0>l&&(l=parseInt(k,10),l>c&&(c=l))})}});c++;return a?c+
"_"+a:c.toString()})}});function ia(d,e,a){this.h=this.g=null;this.u=d;this.i=1;this.A=e;this.j=a;this.l=0;this.m=function(){const b=this;return u(function*(){var c={type:0,wtype:b.i,size:b.g.g()};b.j(c);var f=new J({Ca:1==b.i,da:b.u,Ea:b.g,Ga:b.h});c=function(){var l={type:1,wtype:this.i,begin:this.l,spd:f.j(),posn:this.g.l(),size:this.g.g()};this.j(l);return this.A()?!1:!0}.bind(b);b.l=Date.now();var g=null,k=yield f.start(0,c).catch(function(l){g=l});c={type:2,wtype:b.i,begin:b.l,posn:b.g.l(),size:b.h.u()};g?c.errr=g.message||
g.La:k?b.h.A&&(c.blob=b.h.A()):c.type=3;b.j(c)})};this.o=function(b,c){const f=this;return u(function*(){f.i=1;f.g=b.sa({s:c,N:16E5});f.h=new F;yield f.m()})};this.v=function(b,c,f,g){const k=this;return u(function*(){k.i=2;k.g=new G({ma:f,N:16E5});k.h=b.ta({S:c,H:g});yield k.m()})}};window=self;self.importScripts("vendor/forge.min.js");self.i=!1;function Z(d,e){return new ia(d,function(){return self.i},function(a){2==a.type&&(a.gtoken=e.h?e.h:"");self.postMessage(a)})}
function ja(d){u(function*(){var e=d.type,a=d.cominf,b={iv:window.atob(C(a.iv)),key:window.atob(C(a.key))};self.postMessage({type:0,wtype:e,size:0});var c=new K;yield c.G().catch(function(g){console.error("IndexedDB is not supported in your browser settings.",g)});var f=L[a.drvid];if(f)switch(c=new f.g(c,"https://zgayard.f5.si/grantauth.php"),c.h=a.gtoken,e){case 1:yield Z(b,c).o(c,d.downinf.targetId);break;case 2:e=d.upinf,yield Z(b,c).v(c,e.fname,e.file,e.ptid)}else self.postMessage({type:2,wtype:e,
size:0,errr:"Drive's name is invalid."})})}self.addEventListener("message",function(d){d=d.data;switch(d.type){case 1:case 2:ja(d);break;default:self.i=!0}});

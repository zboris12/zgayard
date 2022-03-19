<?php
//define ("PROXY", "192.168.10.254");
//define ("PROXY_PORT", 8081);
define ("REDIRECT_URI", "Input your url here");
if(!defined("ONEDRIVE_CLIENT_ID")){
	define ("ONEDRIVE_CLIENT_ID", "Input your client id here");
	define ("ONEDRIVE_CLIENT_SECRET", "Input your secret here");
}
if(!defined("GOOGDRIVE_CLIENT_ID")){
	define ("GOOGDRIVE_CLIENT_ID", "Input your client id here");
	define ("GOOGDRIVE_CLIENT_SECRET", "Input your secret here");
}
define ("COOKIE_MAXAGE", 30); // days
define ("HMAC_METHOD", "md5");
define ("HMAC_KEY", "Define a key here");
define ("CRYPT_IV", "Define a iv here");
define ("CRYPT_METHOD", "AES-128-CBC");
?>

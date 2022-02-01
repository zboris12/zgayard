<?php
require_once("config.php");

function getArrayValue($arr, $keynm, $defval=null){
	if(is_array($arr) && array_key_exists($keynm, $arr) && !empty($arr[$keynm])){
		return $arr[$keynm];
	}else{
		return $defval;
	}
}
function getPostValue($keynm, $defval=null){
	return getArrayValue($_POST, $keynm, $defval);
}
function getBaseUrl($url){
	$uarr = parse_url($url);
	$ret = $uarr["scheme"] . "://" . $uarr["host"];
	$port = getArrayValue($uarr, "port", 0);
	if($port > 0){
		$ret = $ret . ":" . $port;
	}
	return $ret;
}
function getLocalStorageAuth($keyOnly=false){
	$lskey64 = getArrayValue($_COOKIE, "lskey");
	$newkey = false;
	if(isset($lskey64)){
		$lskey = base64_decode($lskey64);
	}else{
		$lskey = openssl_random_pseudo_bytes(20);
		$lskey64 = base64_encode($lskey);
		$newkey = true;
	}
	if(defined("LOCALHOST")){
		$secure = false;
	}else{
		$secure = true;
	}
	if(version_compare(phpversion(), "7.3") < 0){
		setcookie("lskey", $lskey64, time() + (86400 * COOKIE_MAXAGE), "/; SameSite=None", "", $secure, true);
	}else{
		setcookie("lskey", $lskey64, array("expires" => time() + (86400 * COOKIE_MAXAGE), "path" => "/", "samesite" => "None", "domain" => "", "secure" => $secure, "httpOnly" => true));
	}
	if($keyOnly){
		return $lskey;
	}else{
		$keyval = base64_encode(hash_hmac(HMAC_METHOD, $lskey, HMAC_KEY));
		return array("newkey" => $newkey, "lsauth" => $keyval);
	}
}
function cryptData($data, $encrypt=true){
	$i = 10;
	$lskey = getLocalStorageAuth(true) . substr(CRYPT_IV, 0, $i);
	$ivlen = openssl_cipher_iv_length(CRYPT_METHOD);
	$iv = substr(CRYPT_IV, $i, $ivlen);
	if($encrypt){
		$dataOut = openssl_encrypt($data, CRYPT_METHOD, $lskey, 0, $iv);
		if($dataOut){
			$dataOut = base64_encode($dataOut);
		}
	}else{
		$dataOut = openssl_decrypt(base64_decode($data), CRYPT_METHOD, $lskey, 0, $iv);
	}
	return $dataOut;
}
function getOnedriveAuth(){
	global $redirectUri;
	//https://docs.microsoft.com/ja-jp/azure/active-directory/develop/v2-oauth2-auth-code-flow
	$data = array(
		  "client_id" => getPostValue("client_id", ONEDRIVE_CLIENT_ID)
		, "redirect_uri" => getPostValue("redirect_uri", $redirectUri)
	);
	$logout = "https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=" . $redirectUri;
	$action = getPostValue("action");
	if(isset($action) && strcasecmp($action, "logout") == 0){
		$result = array();

	}else{
		$code = getPostValue("code");
		$rftoken = getPostValue("refresh_token");
		if(isset($code) || isset($rftoken)){
			$base_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
			$header = array("Content-Type: application/x-www-form-urlencoded");
			$data["scope"] = "files.readwrite";
			$data["client_secret"] = getPostValue("client_secret", ONEDRIVE_CLIENT_SECRET);
			if(isset($code)){
				$data["code"] = $code;
				$data["grant_type"] = "authorization_code";
			}else{
				$data["refresh_token"] = cryptData($rftoken, false);
				$data["grant_type"] = "refresh_token";
			}

			$ch = curl_init();
			if(defined("LOCALHOST")){
				curl_setopt($ch, CURLOPT_VERBOSE, 1);
			}
			curl_setopt($ch, CURLOPT_URL, $base_url);
			curl_setopt($ch, CURLOPT_POST, TRUE);
			curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
			curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
			if(defined("PROXY")){
				curl_setopt($ch, CURLOPT_PROXY, PROXY);
			}
			if(defined("PROXY_PORT")){
				curl_setopt($ch, CURLOPT_PROXYPORT, PROXY_PORT);
			}
			$result = curl_exec($ch);
			curl_close($ch);
			if($result){
				$result = json_decode($result, true);
				$rftoken = getArrayValue($result, "refresh_token");
				if(isset($rftoken)){
					$result["refresh_token"] = cryptData($rftoken);
				}
			}else{
				$result = array("error" => "auth_failed", "error_description" => "Failed to connect $base_url.");
			}

		}else{
			$data["scope"] = "offline_access files.readwrite";
			if(getPostValue("need_code")){
				$data["response_type"] = "code";
			}else{
				$data["response_type"] = "token";
			}
			$state = base64_encode(openssl_random_pseudo_bytes(20));
			$result = array("url" => "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" . http_build_query($data), "state" => $state);
		}
	}

	$result["logout"] = $logout;
	return $result;
}

$redirectUri = ONEDRIVE_REDIRECT_URI;
$ourl = getallheaders()["Origin"];
if($ourl == "http://localhost:10801"){
	$redirectUri = $ourl . "/";
}else{
	$ourl = getBaseUrl(ONEDRIVE_REDIRECT_URI);
}
header("Access-Control-Allow-Origin: " . $ourl);
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json;charset=UTF-8");

$type = getPostValue("drive_type");
if(isset($type)){
	switch($type){
		case "localstorage": {
			$result = getLocalStorageAuth();
			break;
		}
		case "onedrive": {
			$result = getOnedriveAuth();
			break;
		}
		default: {
			$result = array("error" => "invalid_drive_type", "error_description" => "Unknown drive type.");
		}
	}
}else{
	$result = array("error" => "no_drive_type", "error_description" => "Drive type is not specified.");
}
if(is_array($result)){
	echo json_encode($result);
}else{
	echo $result;
}
?>

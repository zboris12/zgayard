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
	global $localhost;
	$lskey64 = getArrayValue($_COOKIE, "lskey");
	$newkey = false;
	if(isset($lskey64)){
		$lskey = base64_decode($lskey64);
	}else{
		$lskey = openssl_random_pseudo_bytes(20);
		$lskey64 = base64_encode($lskey);
		$newkey = true;
	}
	if($localhost){
		$samesite = "Strict";
		$secure = false;
	}else{
		$samesite = "None";
		$secure = true;
	}
	if(version_compare(phpversion(), "7.3") < 0){
		setcookie("lskey", $lskey64, time() + (86400 * COOKIE_MAXAGE), "/; SameSite=".$samesite, "", $secure, true);
	}else{
		setcookie("lskey", $lskey64, array("expires" => time() + (86400 * COOKIE_MAXAGE), "path" => "/", "samesite" => $samesite, "domain" => "", "secure" => $secure, "httpOnly" => true));
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
function getDriveAuth($infs){
	global $localhost;
	global $redirectUri;
	$data = array(
		  "client_id" => getPostValue("client_id", $infs["client_id"])
		, "redirect_uri" => getPostValue("redirect_uri", $redirectUri)
	);
	$action = getPostValue("action");
	if(isset($action) && strcasecmp($action, "logout") == 0){
		$result = array();
	}else{
		$csc = getPostValue("client_secret");
		$cscenc = null;
		if(isset($csc)){
			if($localhost){
				$stdout = fopen("php://stdout", "w");
				fwrite($stdout, "Using customized client informations.\n");
			}
			if(strlen($csc) > 4 && substr($csc, 0, 2) == "zB"){
				$cscenc = substr($csc, 4, strlen($csc) - 4);
				if(substr(hash_hmac(HMAC_METHOD, $cscenc, HMAC_KEY), -2) == substr($csc, 2, 2)){
					if(isset($stdout)){
						fwrite($stdout, "Decrypting client secret.\n");
					}
					$csc = cryptData($cscenc, false);
				}else{
					$cscenc = null;
				}
			}
			if(isset($cscenc)){
				$cscenc = null;
			}else{
				if(isset($stdout)){
					fwrite($stdout, "Encrypting client secret.\n");
				}
				$cscenc = cryptData($csc);
				$cscenc = "zB" . substr(hash_hmac(HMAC_METHOD, $cscenc, HMAC_KEY), -2) . $cscenc;
			}
			if(isset($stdout)){
				fclose($stdout);
			}
		}else{
			$csc = $infs["client_secret"];
		}
		$code = getPostValue("code");
		$rftoken = getPostValue("refresh_token");
		if(isset($code) || isset($rftoken)){
			$base_url = $infs["token_url"];
			$header = array("Content-Type: application/x-www-form-urlencoded");
			$data["scope"] = $infs["token_scope"];
			$data["client_secret"] = $csc;
			if(isset($code)){
				$data["code"] = $code;
				$data["grant_type"] = "authorization_code";
			}else{
				$data["refresh_token"] = cryptData($rftoken, false);
				$data["grant_type"] = "refresh_token";
			}

			$ch = curl_init();
			if($localhost){
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
			$data["scope"] = $infs["login_scope"];
			if(getPostValue("need_code")){
				$data["response_type"] = "code";
				if(array_key_exists("login_extdat", $infs)){
					foreach($infs["login_extdat"] as $extkey => $extval){
						$data[$extkey] = $extval;
					}
				}
			}else{
				$data["response_type"] = "token";
			}
			$state = base64_encode(openssl_random_pseudo_bytes(20));
			$result = array("url" => $infs["login_url"] . "?" . http_build_query($data), "state" => $state);
		}
	}

	$result["logout"] = $infs["logout_url"];
	if(isset($cscenc)){
		$result["client_secret_enc"] = $cscenc;
	}
	return $result;
}
function getOnedriveAuth(){
	global $redirectUri;
	//https://docs.microsoft.com/ja-jp/azure/active-directory/develop/v2-oauth2-auth-code-flow
	$info = array(
		  "client_id" => ONEDRIVE_CLIENT_ID
		, "client_secret" => ONEDRIVE_CLIENT_SECRET
		, "login_url" => "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
		, "login_scope" => "offline_access files.readwrite"
		, "token_url" => "https://login.microsoftonline.com/common/oauth2/v2.0/token"
		, "token_scope" => "files.readwrite"
		, "logout_url" => "https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=" . $redirectUri
	);

	return getDriveAuth($info);
}

function getGoogledriveAuth(){
	$info = array(
		  "client_id" => GOOGDRIVE_CLIENT_ID
		, "client_secret" => GOOGDRIVE_CLIENT_SECRET
		, "login_url" => "https://accounts.google.com/o/oauth2/v2/auth"
		, "login_scope" => "https://www.googleapis.com/auth/drive.file"
		, "login_extdat" => array("access_type" => "offline", "prompt" => "consent")
		, "token_url" => "https://www.googleapis.com/oauth2/v4/token"
		, "token_scope" => "https://www.googleapis.com/auth/drive.file"
		, "logout_url" => "https://accounts.google.com/Logout"
	);

	return getDriveAuth($info);
}

$localhost = false;
$redirectUri = REDIRECT_URI;
$ourl = getallheaders()["Origin"];
if($ourl == "http://localhost:10801"){
	$localhost = true;
	$redirectUri = $ourl . "/src/";
}else{
	$ourl = getBaseUrl(REDIRECT_URI);
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
		case "googledrive": {
			$result = getGoogledriveAuth();
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

<?php
function getArrayValue($arr, $keynm, $defval=null){
	if(is_array($arr) && array_key_exists($keynm, $arr) && !empty($arr[$keynm])){
		return $arr[$keynm];
	}else{
		return $defval;
	}
}

// A solution to solve the 405 failure of OPTIONS request on the case of Onedrive for Business
$heads = getallheaders();
if(strcasecmp($_SERVER["REQUEST_METHOD"], "OPTIONS") == 0){
	header("HTTP/1.1 200 CORS OK");
	header("Access-Control-Allow-Methods: OPTIONS, GET, POST, HEAD");
	header("Access-Control-Allow-Headers: Accept, Application, Authorization, Content-Range, Content-Type, If, If-Match, If-None-Match, Overwrite, Prefer, Range, Scenario, Zb-Url");
	header("Access-Control-Max-Age: 7200");
	header("Access-Control-Allow-Origin: " . $heads["Origin"]);
//	header("Access-Control-Allow-Credentials: true");
	header("Content-Length: 0");

}else{
	$url = getArrayValue(apache_request_headers(), "Zb-Url");
	// Range must be specified.
	if(isset($url) && getArrayValue($heads, "Range") !== null){
		$chead = array();
		foreach($heads as $hkey => $hval){
			if($hkey != "Zb-Url" && $hkey != "Cookie" && $hkey != "Host"){
				$chead[] = $hkey . ": " . $hval;
			}
		}
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER["REQUEST_METHOD"]);
		curl_setopt($ch, CURLOPT_HTTPHEADER, $chead);
		curl_setopt($ch, CURLINFO_HEADER_OUT, TRUE);
		curl_setopt($ch, CURLOPT_HEADER, TRUE);
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, TRUE);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); 
		$ret = curl_exec($ch);
		$info = curl_getinfo($ch);
		curl_close($ch);

		//header
		$hdr = substr($ret, 0, $info["header_size"]);
		if(strpos($hdr, "\r\n") !== false){
			$sep = "\r\n";
		}else if(strpos($hdr, "\n") !== false){
			$sep = "\n";
		}else{
			$sep = "\r";
		}
		foreach(explode($sep, $hdr) as $hh){
			header($hh);
		}
		//body
		echo substr($ret, $info["header_size"]);

	}else{
		http_response_code(500);
		header("Access-Control-Allow-Origin: *");
		header("HTTP/1.1 500 Invalid Request");
		echo "Invalid Request<br />\n";
		if(!isset($url)){
			echo "No Url!<br />\n";
		}
		if(getArrayValue($heads, "Range") === null){
			echo "No Range<br />\n";
		}
	}
}
?>

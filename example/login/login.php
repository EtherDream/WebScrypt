<?php
// param: user
$user = @$_POST['user'];
if (strlen($user) == 0) {
	die('invalid username');
}

// param: dk
$dkHex = @$_POST['dk'];
if (strlen($dkHex) != 64) {
	die('invalid dk length');
}

$dkBin = @pack('H*', $dkHex);
if (strlen($dkBin) != 32) {
	die('invalid dk encode');
}


// open database
$json = file_get_contents('db.json');
$DATABASE = json_decode($json, true);

// query user
$FIELD = @$DATABASE[$user];
if (!$FIELD) {
	die('user not exist');
}

$saltBin = @pack('H*', $FIELD['s_salt']);
$submited = hash('sha256', $dkBin . $saltBin, true);


// auth
$expected = @pack('H*', $FIELD['s_hash']);
if ($expected != $submited) {
	die('password incorrect');
}

$pubInfo = $FIELD['pub_info'];
$secInfo = @pack('H*', $FIELD['sec_info']);


// decrypt
$key = md5($dkBin, true);
$secInfo ^= $key;

$info = str_replace('%s', $secInfo, $pubInfo);
echo("ok\n$info");

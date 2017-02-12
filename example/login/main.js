// 时间成本：N * P / thread
// 空间成本：r * 128 * N * thread = 512 MB
var param = {
	N: 1048576,
	r: 1,
	P: 4
};
var opt = {
	maxThread: 4
};

// 留 10% 的进度给网络请求
scrypt.onprogress = function(percent) {
	updateProg(percent * 0.9);
};

scrypt.oncomplete = function(dkBin) {
	console.log('time:', +new Date() - tick);

	var dkHex = scrypt.binToHex(dkBin);
	console.log('dk:', dkHex);

	var param = {
		user: $('#txtUsr').val(),
		dk: dkHex
	};

	$.post('login.php', param, function(data, status) {
		console.log(data);

		var arr = data.split('\n');
		if (arr[0] == 'ok') {
			updateProg(1);
			updateState('登录成功！');
			$('#txtUserInfo').text(arr[1]);
		} else {;
			$('#btnLogin').prop('disabled', false);
			updateProg(0);
			updateState('登录失败！')
		}
	});
};

scrypt.onready = function() {
	$('#btnLogin').prop('disabled', false);
	updateState('准备就绪');
};

scrypt.onload = function() {
	console.log('scrypt loaded');
	try {
		scrypt.config(param, opt);
	} catch (err) {
		alert('config err: ' + err.message);
	}
};

scrypt.onerror = function(err) {
	updateState('模块加载失败: ' + err);
};


var progBarStyle = $('#progBar')[0].style;
var tick;

function updateProg(percent) {
	progBarStyle.width = (percent * 100) + '%';
}

function updateState(s) {
	$('#txtState').text(s);
}

function submit() {
	var usr = $('#txtUsr').val();
	var pwd = $('#txtPwd').val();
	if (!usr) {
		updateState('请输入用户名');
		return;
	}

	var pass = scrypt.strToBin(pwd);
	var salt = scrypt.strToBin(usr);

	$('#btnLogin').prop('disabled', true);
	updateState('身份鉴定中...');

	tick = +new Date();

	try {
		scrypt.hash(pass, salt, 32);
	} catch (err) {
		alert('hash err: ' + err.message);
	}
}

$('#btnLogin').click(submit);

function main() {
	var mods = scrypt.getAvailableMod();
	if (mods.length == 0) {
		alert('浏览器必须支持 asm.js 或者 Flash Player 18+');
		return;
	}

	// 设置模块资源的路径
	updateState('模块加载中...');
	scrypt.setResPath('../../release/asset');
	scrypt.load();
}

main();
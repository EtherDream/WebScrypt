var tick;
var progBarStyle = $('#progBar')[0].style;

scrypt.onprogress = function(percent) {
    progBarStyle.width = (percent * 100) + '%';
};

scrypt.oncomplete = function(dk) {
    var t = +new Date() - tick;
    print('done! time: ' + t + 'ms');

    print('dk: ' + scrypt.binToHex(dk));
    updateButton(1, 0);
};

scrypt.onready = function() {
    var pass = getPassBytes();
    var salt = getSaltBytes();
    var dkLen = getTextVal('#txtDkLen');

    tick = +new Date();

    try {
        scrypt.hash(pass, salt, dkLen);
    } catch (err) {
        print('scrypt.hash err: ' + err.message);
        updateButton(1, 0);
    }
};

scrypt.onload = function() {
    print('loaded');
    updateButton(1, 0);
    updateCost();
};

scrypt.onerror = function(err) {
    print('scrypt.onerror: ' + err);
};

/*------------------------------*/
var param = {};
var opt = {
    maxPassLen: 1024,
    maxSaltLen: 1024,
    maxDkLen: 1024,
    maxThread: 1
};

$('#btnHash').click(function() {
    updateParam();
    try {
        scrypt.config(param, opt);
    } catch (err) {
        print('scrypt.config err: ' + err.message);
        return;
    }

    var pass = $('#txtPass').val();
    var salt = $('#txtSalt').val();

    pass = formatVal(pass, $('#chkHexPass').prop('checked'));
    salt = formatVal(salt, $('#chkHexSalt').prop('checked'));

    print(
        'scrypt(' +
        'P=' + pass + ', ' +
        'S=' + salt + ', ' +
        'N=' + param.N + ', ' +
        'r=' + param.r + ', ' +
        'P=' + param.P + ', ' +
        'dkLen=' + $('#txtDkLen').val() + ')'
    );
    updateButton(0, 1);
});

$('#btnStop').click(function() {
    scrypt.stop();

    print('canceled');
    updateButton(1, 0);
});

$('#btnCls').click(function() {
    $('#txtLog').html('');
});

$('#optMod').change(function() {
    var mod = this.options[this.selectedIndex].value;
    loadMod(mod);
});

$('#chkHexPass').click(function() {
    updateHex($('#txtPass'), this.checked);
});

$('#chkHexSalt').click(function() {
    updateHex($('#txtSalt'), this.checked);
});

$('.column.params input').change(updateCost);

/*------------------------------*/
var curMod;

function loadMod(mod) {
    if (curMod == mod) {
        return;
    }
    curMod = mod;
    
    print('loading module ' + mod);
    updateButton(0, 0);
    
    scrypt.unload();

    if (mod == 'auto') {
        scrypt.load();
    } else {
        scrypt.load(mod);
    }
}

function getPassBytes() {
    var v = $('#txtPass').val();

    return $('#chkHexPass').prop('checked') ?
        scrypt.hexToBin(v) :
        scrypt.strToBin(v) ;
}

function getSaltBytes() {
    var v = $('#txtSalt').val();

    return $('#chkHexSalt').prop('checked') ?
        scrypt.hexToBin(v) :
        scrypt.strToBin(v) ;
}

function formatVal(val, isHex) {
    return isHex ?
        ('0x' + val) :
        ('"' + val + '"') ;
}

function updateHex(textbox, showHex) {
    if (showHex) {
        var str = textbox.val();
        var bin = scrypt.strToBin(str);
        var hex = scrypt.binToHex(bin);
        textbox.val(hex);
    } else {
        var hex = textbox.val();
        var bin = scrypt.hexToBin(hex);
        var str = scrypt.binToStr(bin);
        textbox.val(str);
    }
}

function updateButton(b1, b2) {
    $('#btnHash').prop('disabled', !b1);
    $('#btnStop').prop('disabled', !b2);
}

function formatByte(v) {
    var unit = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    while (v >= 1024 && i < unit.length - 1) {
        v /= 1024;
        i++;
    }
    return Math.round(v * 100) / 100 + unit[i];
}

function getTextVal(s) {
    return parseInt($(s).val(), 10);
}

function updateParam() {
    param.N = Math.pow(2, getTextVal('#txtLog2N'));
    param.r = getTextVal('#txtArgR');
    param.P = getTextVal('#txtArgP');
    opt.maxThread = getTextVal('#txtThread');
}

function updateCost() {
    updateParam();    
    try {
        // check param
        scrypt.config(param, opt, true);
    } catch (err) {
        $('#txtMemCost').text('INVALID');
        return;
    }

    var maxPerThread = Math.ceil(param.P / opt.maxThread);
    var threadNeed = Math.ceil(param.P / maxPerThread);

    var mem = param.N * 128 * param.r * threadNeed;
    $('#txtMemCost').text(
        param.N + ' * ' + param.r + ' * 128 * ' + threadNeed +
        ' = ' + formatByte(mem)
    );
}

function print(s) {
    $('#txtLog')
        .append(s + '<br>')
        .scrollTop(1e6);
}

function initModOptBox() {
    var list = scrypt.getAvailableMod();
    if (list.length == 0) {
        print('HTML5 or Flash Player 18+');
        updateButton(0, 0);
        return;
    }

    var set = {auto: true};

    $.each(list, function(i, name) {
        set[name] = true;
    });

    var optBox = $('#optMod');
    $.each(optBox[0], function(i, item) {
        item.disabled = !(item.value in set);
    });
    optBox.change();
}

function main() {
    scrypt.setResPath('../../release/asset');

    var sysThread = navigator.hardwareConcurrency;
    if (sysThread != null) {
        if (sysThread > 4) {
            txtThread.value = sysThread / 2;
        } else {
            txtThread.value = sysThread;
        }
    }

    $('#txtLog').val('');
    print('UserAgent: ' + navigator.userAgent);
    print('SysThread: ' + sysThread);
    print('--------------------');

    initModOptBox();
}

$(main);

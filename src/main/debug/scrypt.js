/** @const */
var _DEBUG = (typeof _RELEASE == 'undefined');
var Util;
(function (Util) {
    var _Uint8Array = window['Uint8Array'];
    function allocBuf(size) {
        return _Uint8Array ? new _Uint8Array(size) : new Array(size);
    }
    function createBuf(buf) {
        return _Uint8Array ? new _Uint8Array(buf) : buf;
    }
    function hexToBytes(inStr) {
        var outLen = inStr.length / 2;
        var outBuf = allocBuf(outLen);
        for (var i = 0; i < outLen; i++) {
            var byte = parseInt(inStr.substr(i * 2, 2), 16);
            if (isNaN(byte)) {
                throw Error('invalid hex data');
            }
            outBuf[i] = byte;
        }
        return outBuf;
    }
    Util.hexToBytes = hexToBytes;
    function bytesToHex(inBuf) {
        var inLen = inBuf.length;
        var outStr = '';
        for (var i = 0; i < inLen; i++) {
            var byte = inBuf[i] & 0xff;
            var hex = byte.toString(16);
            if (byte < 16) {
                hex = '0' + hex;
            }
            outStr += hex;
        }
        return outStr;
    }
    Util.bytesToHex = bytesToHex;
    function strToBytes(inStr) {
        var _TextEncoder = window['TextEncoder'];
        if (_TextEncoder) {
            return new _TextEncoder().encode(inStr);
        }
        var outBuf = [], i = 0, j = 0, s = encodeURI(inStr), n = s.length;
        while (i < n) {
            var ch = s.charCodeAt(i);
            if (ch == 37) {
                var hex = s.substr(i + 1, 2);
                ch = parseInt(hex, 16);
                i += 3;
            }
            else {
                i++;
            }
            outBuf[j++] = ch;
        }
        return createBuf(outBuf);
    }
    Util.strToBytes = strToBytes;
    function bytesToStr(inBuf) {
        var inLen = inBuf.length;
        var outStr = '';
        for (var i = 0; i < inLen; i++) {
            var byte = inBuf[i];
            var hex = byte.toString(16);
            if (byte < 16) {
                hex = '0' + hex;
            }
            outStr += ('%' + hex);
        }
        return decodeURIComponent(outStr);
    }
    Util.bytesToStr = bytesToStr;
    function hideDom(el) {
        el.style.cssText = 'position:absolute;top:-999px';
    }
    Util.hideDom = hideDom;
})(Util || (Util = {}));
///<reference path="Const.ts"/>
///<reference path="Util.ts"/>
var ModAsmJs;
(function (ModAsmJs) {
    var mAsmMod;
    function check() {
        return 'Worker' in window;
    }
    ModAsmJs.check = check;
    function load(path) {
        Scrypt['__asmjs_cb'] = callbackHandler;
        var url = path + 'asmjs.js';
        if (_DEBUG) {
            url = '/src/mod_asmjs/debug/asmjs.js';
        }
        var spt = document.createElement('script');
        spt.onerror = function () {
            ModAsmJs.onerror('script load fail');
        };
        spt.src = url;
        document.body.appendChild(spt);
    }
    ModAsmJs.load = load;
    function hash(pass, salt, dkLen) {
        mAsmMod.hash(pass, salt, dkLen);
    }
    ModAsmJs.hash = hash;
    function config(N, r, P, thread, maxPassLen, maxSaltLen, maxDkLen) {
        mAsmMod.config.apply(this, arguments);
    }
    ModAsmJs.config = config;
    function stop() {
        mAsmMod.stop();
    }
    ModAsmJs.stop = stop;
    function free() {
        mAsmMod.free();
    }
    ModAsmJs.free = free;
    function unload() {
        if (mAsmMod) {
            mAsmMod.unload();
            mAsmMod = null;
        }
    }
    ModAsmJs.unload = unload;
    function callbackHandler(msg, data) {
        if (msg == 'onload') {
            mAsmMod = data;
        }
        ModAsmJs[msg](data);
    }
})(ModAsmJs || (ModAsmJs = {}));
///<reference path="Const.ts"/>
///<reference path="Util.ts"/>
var ModFlash;
(function (ModFlash) {
    var mSwf;
    var mActiveX;
    function check() {
        return getVer() >= 18;
    }
    ModFlash.check = check;
    function load(path) {
        Scrypt['__flash_cb'] = callbackHandler;
        var url = path + 'flash.swf';
        if (_DEBUG) {
            url = '/src/mod_flash/bin-debug/Scrypt.swf';
        }
        mSwf = createSwf(url);
        Util.hideDom(mSwf);
    }
    ModFlash.load = load;
    function hash(pass, salt, dkLen) {
        var passHex = Util.bytesToHex(pass);
        var saltHex = Util.bytesToHex(salt);
        mSwf['hash'](passHex, saltHex, dkLen);
    }
    ModFlash.hash = hash;
    function config(N, r, P, thread, maxPassLen, maxSaltLen, maxDkLen) {
        mSwf['config'].apply(mSwf, arguments);
    }
    ModFlash.config = config;
    function stop() {
        mSwf['cancel']();
    }
    ModFlash.stop = stop;
    function free() {
        mSwf['free']();
        mSwf = null;
    }
    ModFlash.free = free;
    function unload() {
        document.body.removeChild(mSwf);
        mSwf = null;
    }
    ModFlash.unload = unload;
    function callbackHandler(msg, data) {
        if (msg == 'oncomplete') {
            data = Util.hexToBytes(data);
        }
        try {
            ModFlash[msg](data);
        }
        catch (err) {
            throw err;
        }
    }
    function createSwf(url) {
        var box = document.createElement('div');
        var id = '_' + (Math.random() * 1e6 | 0);
        url = encodeURI(url);
        box.innerHTML = mActiveX
            ? "<object id=" + id + " classid=clsid:D27CDB6E-AE6D-11cf-96B8-444553540000><param name=movie value=" + url + "><param name=allowScriptAccess value=always></object>"
            : "<embed id=" + id + " name=" + id + " src=" + url + " type=application/x-shockwave-flash allowScriptAccess=always></embed>";
        var swf = box.firstChild;
        document.body.appendChild(swf);
        return swf;
    }
    var R_VER = /\d+\.\d+/;
    function getPluginVer() {
        var plugins = navigator.plugins;
        if (!plugins) {
            return;
        }
        var item = plugins['Shockwave Flash'];
        if (!item) {
            return;
        }
        var desc = item.description;
        if (!desc) {
            return;
        }
        return +desc.match(R_VER);
    }
    function getActiveXVer() {
        var ACTIVEX = window['ActiveXObject'];
        if (!ACTIVEX) {
            return;
        }
        var ver = '';
        try {
            ver = new ACTIVEX('ShockwaveFlash.ShockwaveFlash')
                .GetVariable('$version')
                .replace(',', '.');
        }
        catch (err) {
            return;
        }
        return +ver.match(R_VER);
    }
    function getVer() {
        var v = getPluginVer();
        if (v > 0) {
            return v;
        }
        v = getActiveXVer();
        if (v > 0) {
            mActiveX = true;
            return v;
        }
        return 0;
    }
})(ModFlash || (ModFlash = {}));
///<reference path="Const.ts"/>
///<reference path="Util.ts"/>
///<reference path="IMod.d.ts"/>
///<reference path="ModAsmJs.ts"/>
///<reference path="ModFlash.ts"/>
var Scrypt;
(function (Scrypt) {
    var MOD_MAP = {
        'asmjs': ModAsmJs,
        'flash': ModFlash
    };
    ;
    ;
    var mState = 0 /* NONE */, mMod, mAvailableAPI, mResPath = '', mLoaderTimer = 0, mTimeout = 30000 /* LOAD_TIMEOUT */;
    var mMaxPassLen = 64, mMaxSaltLen = 64, mMaxDkLen = 64, mMaxThread = 1;
    function chooseBestMod() {
        var list = getAvailableMod();
        var set = {};
        for (var i = 0; i < list.length; i++) {
            set[list[i]] = true;
        }
        // TODO
        var ua = navigator.userAgent;
        if (/Chrome|Firefox|Edge|Safari/.test(ua)) {
            if ('asmjs' in set) {
                return 'asmjs';
            }
        }
        if ('flash' in set) {
            return 'flash';
        }
        return null;
    }
    function raise(fn, arg1) {
        if (!fn) {
            return;
        }
        switch (arguments.length) {
            case 1: return fn();
            case 2: return fn(arg1);
        }
    }
    function clearTimer() {
        if (mLoaderTimer) {
            clearTimeout(mLoaderTimer);
            mLoaderTimer = 0;
        }
    }
    // function test() {
    //     const pass = strToBin('pleaseletmein');
    //     const salt = strToBin('SodiumChloride');
    //     const expected = [
    //         0x25, 0xa9, 0xfa, 0x20, 0x7f, 0x87, 0xca, 0x09,
    //         0xa4, 0xef, 0x8b, 0x9f, 0x77, 0x7a, 0xca, 0x16,
    //         0xbe, 0xb7, 0x84, 0xae, 0x18, 0x30, 0xbf, 0xbf,
    //         0xd3, 0x83, 0x25, 0xaa, 0xbb, 0x93, 0x77, 0xdf,
    //         0x1b, 0xa7, 0x84, 0xd7, 0x46, 0xea, 0x27, 0x3b,
    //         0xf5, 0x16, 0xa4, 0x6f, 0xbf, 0xac, 0xf5, 0x11,
    //         0xc5, 0xbe, 0xba, 0x4c, 0x4a, 0xb3, 0xac, 0xc7,
    //         0xfa, 0x6f, 0x46, 0x0b, 0x6c, 0x0f, 0x47, 0x7b,
    //     ];
    //     hash(pass, salt);
    // }
    function hash(pass, salt, dkLen) {
        // check state
        if (mState < 2 /* LOADED */) {
            throw Error('scrypt not loaded');
        }
        if (mState < 4 /* READY */) {
            throw Error('scrypt not configed');
        }
        if (mState == 5 /* RUNNING */) {
            throw Error('scrypt is running');
        }
        mState = 5 /* RUNNING */;
        // null check
        dkLen = dkLen || mMaxDkLen;
        pass = pass || [];
        salt = salt || [];
        // check length
        if (pass.length > mMaxPassLen) {
            throw Error('pass.length > maxPassLen');
        }
        if (salt.length > mMaxSaltLen) {
            throw Error('salt.length > maxSaltLen');
        }
        if (dkLen > mMaxDkLen) {
            throw Error('dkLen > maxDkLen');
        }
        mMod.hash(pass, salt, dkLen);
    }
    Scrypt.hash = hash;
    function getAvailableMod() {
        if (!mAvailableAPI) {
            mAvailableAPI = [];
            for (var k in MOD_MAP) {
                if (MOD_MAP[k].check()) {
                    mAvailableAPI.push(k);
                }
            }
        }
        return mAvailableAPI;
    }
    Scrypt.getAvailableMod = getAvailableMod;
    function load(mod) {
        if (mState >= 1 /* LOADING */) {
            return;
        }
        if (!mod) {
            mod = chooseBestMod();
            if (!mod) {
                throw Error('no available mod');
            }
        }
        mMod = MOD_MAP[mod];
        if (!mMod) {
            throw Error('unsupported mod: ' + mod);
        }
        mMod.onload = function () {
            clearTimer();
            raise(Scrypt.onload);
        };
        mMod.onerror = function (err) {
            unload();
            raise(Scrypt.onerror, err);
        };
        mMod.onready = function () {
            mState = 4 /* READY */;
            raise(Scrypt.onready);
        };
        mMod.onprogress = function (percent) {
            raise(Scrypt.onprogress, percent);
        };
        mMod.oncomplete = function (dk) {
            mState = 4 /* READY */;
            raise(Scrypt.onprogress, 1);
            raise(Scrypt.oncomplete, dk);
        };
        // 加载计时
        clearTimer();
        mLoaderTimer = setTimeout(function () {
            unload();
            raise(Scrypt.onerror, 'load timeout');
        }, mTimeout);
        mState = 1 /* LOADING */;
        mMod.load(mResPath);
    }
    Scrypt.load = load;
    function stop() {
        mMod.stop();
        mState = 4 /* READY */;
    }
    Scrypt.stop = stop;
    function free() {
        if (mState == 4 /* READY */) {
            mMod.free();
            mState = 2 /* LOADED */;
        }
    }
    Scrypt.free = free;
    function unload() {
        if (mState != 0 /* NONE */) {
            mMod.unload();
            mState = 0 /* NONE */;
        }
        clearTimer();
    }
    Scrypt.unload = unload;
    function config(param, opt, test) {
        if (!param) {
            throw Error('config() takes at least 1 argument');
        }
        var N = param['N'] | 0;
        if (!(1 < N && N <= 8388608 /* MAX_N */)) {
            throw Error("param N out of range (1 < N <= 2^23)");
        }
        if (N & (N - 1)) {
            throw Error('param N must be power of 2');
        }
        var r = param['r'] | 0;
        if (!(0 < r && r < 256)) {
            throw Error('param r out of range (0 < r < 256)');
        }
        var P = param['P'] | 0;
        if (!(0 < P && P < 256)) {
            throw Error('param P out of range (0 < P < 256)');
        }
        var memCost = N * r * 128;
        if (memCost > 1073741824 /* MAX_MEM */) {
            throw Error('memory limit exceeded (N * r * 128 > 1G)');
        }
        // option param
        if (opt) {
            var maxPassLen = opt['maxPassLen'];
            if (maxPassLen == null) {
                maxPassLen = mMaxPassLen;
            }
            else if (maxPassLen <= 0) {
                throw Error('invalid maxPassLen');
            }
            var maxSaltLen = opt['maxSaltLen'];
            if (maxSaltLen == null) {
                maxSaltLen = mMaxSaltLen;
            }
            else if (maxSaltLen <= 0) {
                throw Error('invalid maxSaltLen');
            }
            var maxDkLen = opt['maxDkLen'];
            if (maxDkLen == null) {
                maxDkLen = mMaxDkLen;
            }
            else if (maxDkLen <= 0) {
                throw Error('invalid maxDkLen');
            }
            var maxThread = opt['maxThread'];
            if (maxThread == null) {
                maxThread = mMaxThread;
            }
            else if (maxThread <= 0) {
                throw Error('invalid maxThread');
            }
            if (!test) {
                mMaxPassLen = maxPassLen | 0;
                mMaxSaltLen = maxSaltLen | 0;
                mMaxDkLen = maxDkLen | 0;
                mMaxThread = maxThread | 0;
            }
        }
        // test param
        if (test) {
            return;
        }
        var taskPerThread = Math.ceil(P / mMaxThread);
        var threadCount = Math.ceil(P / taskPerThread);
        mMod.config(N, r, P, threadCount, mMaxPassLen, mMaxSaltLen, mMaxDkLen);
        mState = 3 /* CONFIGING */;
    }
    Scrypt.config = config;
    function strToBin(str) {
        return Util.strToBytes(str);
    }
    Scrypt.strToBin = strToBin;
    function binToStr(bin) {
        return Util.bytesToStr(bin);
    }
    Scrypt.binToStr = binToStr;
    function hexToBin(hex) {
        if (hex.length % 2) {
            throw Error('invalid hex length');
        }
        return Util.hexToBytes(hex);
    }
    Scrypt.hexToBin = hexToBin;
    function binToHex(bin) {
        return Util.bytesToHex(bin);
    }
    Scrypt.binToHex = binToHex;
    function setResPath(path) {
        if (!/\/$/.test(path)) {
            path += '/';
        }
        mResPath = path;
    }
    Scrypt.setResPath = setResPath;
    function setResTimeout(ms) {
        mTimeout = ms;
    }
    Scrypt.setResTimeout = setResTimeout;
    window['scrypt'] = Scrypt;
})(Scrypt || (Scrypt = {}));
//# sourceMappingURL=scrypt.js.map
///<reference path="Const.ts"/>
///<reference path="Util.ts"/>
///<reference path="IMod.d.ts"/>
///<reference path="ModAsmJs.ts"/>
///<reference path="ModFlash.ts"/>


module Scrypt {

    const MOD_MAP : { [k:string] : IMod} = {
        'asmjs': ModAsmJs,
        'flash': ModFlash,
    };

    const enum CONST {
        MAX_MEM = 1 << 30,          // 1G
        MAX_N = MAX_MEM / 128,
        LOAD_TIMEOUT = 30 * 1000,   // 30s
    };


    const enum STATE {
        NONE,
        LOADING,
        LOADED,
        CONFIGING,
        READY,
        RUNNING,
    };

    let mState = STATE.NONE,
        mMod: IMod,
        mAvailableAPI: string[],
        mResPath = '',
        mLoaderTimer = 0,
        mTimeout = CONST.LOAD_TIMEOUT;


    let mMaxPassLen = 64,
        mMaxSaltLen = 64,
        mMaxDkLen = 64,
        mMaxThread = 1;


    export let onload: () => void;
    export let onerror: (err: string) => void;
    export let onready: () => void;
    export let onprogress: (percent: number) => void;
    export let oncomplete: (dkHex: string) => void;


    function chooseBestMod() {
        let list = getAvailableMod();
        let set = {};

        for (let i = 0; i < list.length; i++) {
            set[ list[i] ] = true;
        }

        // TODO
        let ua = navigator.userAgent;
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

    function raise(fn: Function, arg1?) {
        if (!fn) {
            return;
        }
        switch (arguments.length) {
            case 1: return fn();
            case 2: return fn(arg1);
            // ...
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

    export function hash(pass: Bytes, salt: Bytes, dkLen: number) {
        // check state
        if (mState < STATE.LOADED) {
            throw Error('scrypt not loaded');
        }
        if (mState < STATE.READY) {
            throw Error('scrypt not configed');
        }
        if (mState == STATE.RUNNING) {
            throw Error('scrypt is running');
        }
        mState = STATE.RUNNING;

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
    
    export function getAvailableMod() {
        if (!mAvailableAPI) {
            mAvailableAPI = [];
            
            for (let k in MOD_MAP) {
                if (MOD_MAP[k].check()) {
                    mAvailableAPI.push(k);
                }
            }
        }
        return mAvailableAPI;
    }
    
    export function load(mod?: string) {
        if (mState >= STATE.LOADING) {
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

        mMod.onload = function() {
            clearTimer();
            raise(onload);
        };

        mMod.onerror = function(err) {
            unload();
            raise(onerror, err);
        };

        mMod.onready = function() {
            mState = STATE.READY;
            raise(onready);
        };

        mMod.onprogress = function(percent) {
            raise(onprogress, percent);
        };

        mMod.oncomplete = function(dk) {
            mState = STATE.READY;
            raise(onprogress, 1);
            raise(oncomplete, dk);
        };

        // 加载计时
        clearTimer();

        mLoaderTimer = setTimeout(function() {
            unload();
            raise(onerror, 'load timeout');
        }, mTimeout);

        mState = STATE.LOADING;
        mMod.load(mResPath);
    }
    
    export function stop() {
        mMod.stop();
        mState = STATE.READY;
    }
    
    export function free() {
        if (mState == STATE.READY) {
            mMod.free();
            mState = STATE.LOADED;
        }
    }

    export function unload() {
        if (mState != STATE.NONE) {
            mMod.unload();
            mState = STATE.NONE;
        }
        clearTimer();
    }
    
    export function config(param, opt?, test?: boolean) {
        if (!param) {
            throw Error('config() takes at least 1 argument');
        }

        let N = param['N'] | 0;
        if (! (1 < N && N <= CONST.MAX_N)) {
            throw Error(`param N out of range (1 < N <= 2^23)`);
        }
        if (N & (N - 1)) {
            throw Error('param N must be power of 2');
        }

        let r = param['r'] | 0;
        if (! (0 < r && r < 256)) {
            throw Error('param r out of range (0 < r < 256)');
        }

        let P = param['P'] | 0;
        if (! (0 < P && P < 256)) {
            throw Error('param P out of range (0 < P < 256)');
        }

        let memCost = N * r * 128;
        if (memCost > CONST.MAX_MEM) {
            throw Error('memory limit exceeded (N * r * 128 > 1G)')
        }

        // option param
        if (opt) {
            let maxPassLen = opt['maxPassLen'];
            if (maxPassLen == null) {
                maxPassLen = mMaxPassLen;
            } else if (maxPassLen <= 0) {
                throw Error('invalid maxPassLen');
            }

            let maxSaltLen = opt['maxSaltLen'];
            if (maxSaltLen == null) {
                maxSaltLen = mMaxSaltLen;
            } else if (maxSaltLen <= 0) {
                throw Error('invalid maxSaltLen');
            }

            let maxDkLen = opt['maxDkLen'];
            if (maxDkLen == null) {
                maxDkLen = mMaxDkLen;
            } else if (maxDkLen <= 0) {
                throw Error('invalid maxDkLen');
            }

            let maxThread = opt['maxThread'];
            if (maxThread == null) {
                maxThread = mMaxThread;
            } else if (maxThread <= 0) {
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

        let taskPerThread = Math.ceil(P / mMaxThread);
        let threadCount = Math.ceil(P / taskPerThread);

        mMod.config(N, r, P, threadCount, mMaxPassLen, mMaxSaltLen, mMaxDkLen);

        mState = STATE.CONFIGING;
    }
    
    export function strToBin(str: string) : Bytes {
        return Util.strToBytes(str);
    }
    
    export function binToStr(bin: Bytes) : string {
        return Util.bytesToStr(bin);
    }

    export function hexToBin(hex: string) : Bytes {
        if (hex.length % 2) {
            throw Error('invalid hex length');
        }
        return Util.hexToBytes(hex);
    }

    export function binToHex(bin: Bytes) : string {
        return Util.bytesToHex(bin);
    }

    export function setResPath(path: string) {
        if (! /\/$/.test(path)) {
            path += '/';
        }
        mResPath = path;
    }

    export function setResTimeout(ms: number) {
        mTimeout = ms;
    }
    
    window['scrypt'] = Scrypt;
}
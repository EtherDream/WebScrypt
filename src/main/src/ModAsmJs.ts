///<reference path="Const.ts"/>
///<reference path="Util.ts"/>


module ModAsmJs {
    let mAsmMod;

    
    export function check() {
        return 'Worker' in window;
    }
    
    export function load(path: string) {
        Scrypt['__asmjs_cb'] = callbackHandler;

        let url = path + 'asmjs.js';
        if (_DEBUG) {
            url = '/src/mod_asmjs/debug/asmjs.js';
        }
        
        let spt = document.createElement('script');

        spt.onerror = function() {
            (ModAsmJs as IMod).onerror('script load fail');
        };
        spt.src = url;
        document.body.appendChild(spt);
    }

    export function hash(pass: Bytes, salt: Bytes, dkLen: number) {
        mAsmMod.hash(pass, salt, dkLen);
    }
    
    export function config(
        N: number, r: number, P: number,
        thread: number,
        maxPassLen: number, maxSaltLen: number, maxDkLen: number
    ) {
        mAsmMod['config'].apply(this, arguments);
    }
    
    export function stop() {
        mAsmMod.stop();
    }

    export function free() {
        mAsmMod.free();
    }

    export function unload() {
        if (mAsmMod) {
            mAsmMod.unload();
            mAsmMod = null;
        }
    }

    function callbackHandler(msg, data?) {
        if (msg == 'onload') {
            mAsmMod = data;
        }
        ModAsmJs[msg](data);
    }
}
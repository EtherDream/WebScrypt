///<reference path="Const.ts"/>
///<reference path="Util.ts"/>

module ModFlash {
    let mSwf: HTMLElement;
    let mActiveX: boolean;


    export function check() {
        return getVer() >= 18;
    }
    
    export function load(path: string) {
        Scrypt['__flash_cb'] = callbackHandler;

        let url = path + 'flash.swf';
        if (_DEBUG) {
            url = '/src/mod_flash/bin-debug/Scrypt.swf';
        }
        
        mSwf = createSwf(url);
        Util.hideDom(mSwf);
    }
    
    export function hash(pass: Bytes, salt: Bytes, dkLen: number) {
        let passHex = Util.bytesToHex(pass);
        let saltHex = Util.bytesToHex(salt);
        
        mSwf['hash'](passHex, saltHex, dkLen);
    }
    
    export function config(
        N: number, r: number, P: number,
        thread: number,
        maxPassLen: number, maxSaltLen: number, maxDkLen: number
    ) {
        mSwf['config'].apply(mSwf, arguments);
    }
    
    export function stop() {
        mSwf['cancel']();
    }

    export function free() {
        mSwf['free']();
        mSwf = null;
    }

    export function unload() {
        document.body.removeChild(mSwf);
        mSwf = null;
    }

    
    function callbackHandler(msg, data?) {
        if (msg == 'oncomplete') {
            data = Util.hexToBytes(data);
        }
        try {
            ModFlash[msg](data);
        } catch (err) {
            throw err;
        }
    }

    function createSwf(url: string) : HTMLElement {
        let box = document.createElement('div');
        let id = '_' + (Math.random() * 1e6 | 0);

        url = encodeURI(url);

        box.innerHTML = mActiveX
            ? `<object id=${id} classid=clsid:D27CDB6E-AE6D-11cf-96B8-444553540000><param name=movie value=${url}><param name=allowScriptAccess value=always></object>`
            : `<embed id=${id} name=${id} src=${url} type=application/x-shockwave-flash allowScriptAccess=always></embed>`
        
        let swf = box.firstChild as HTMLElement;
        document.body.appendChild(swf);
        return swf;
    }

    function toNum(s) {
        return +s.match(/\d+\.\d+/);
    }


    const R_VER = /\d+\.\d+/;

    function getPluginVer() {
        let plugins = navigator.plugins;
        if (!plugins) {
            return;
        }
        let item = plugins['Shockwave Flash'];
        if (!item) {
            return;
        }
        let desc = item.description;
        if (!desc) {
            return;
        }
        return +desc.match(R_VER);
    }

    function getActiveXVer() {
        let ACTIVEX = window['ActiveXObject'];
        if (!ACTIVEX) {
            return;
        }
        let ver = '';
        try {
            ver = new ACTIVEX('ShockwaveFlash.ShockwaveFlash')
                .GetVariable('$version')
                .replace(',', '.');
        } catch (err) {
            return;
        }
        return +ver.match(/\d+\.\d+/);
    }

    function getVer() : number {
        let v = getPluginVer();
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
}
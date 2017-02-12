
module Util {
    const _Uint8Array: Uint8ArrayConstructor = window['Uint8Array'];

    function allocBuf(size: number) : Bytes {
        return _Uint8Array? new _Uint8Array(size) : new Array(size);
    }

    function createBuf(buf: number[]) : Bytes {
        return _Uint8Array? new _Uint8Array(buf) : buf;
    }


    export function hexToBytes(inStr: string) : Bytes {
        let outLen = inStr.length / 2;
        let outBuf = allocBuf(outLen);

        for (let i = 0; i < outLen; i++) {
            let byte = parseInt(inStr.substr(i * 2, 2), 16);
            if (isNaN(byte)) {
                throw Error('invalid hex data');
            }
            outBuf[i] = byte;
        }
        return outBuf;
    }

    export function bytesToHex(inBuf: Bytes) : string {
        let inLen = inBuf.length;
        let outStr = '';

        for (let i = 0; i < inLen; i++) {
            let byte = inBuf[i] & 0xff;
            let hex = byte.toString(16);
            if (byte < 16) {
                hex = '0' + hex;
            }
            outStr += hex;
        }
        return outStr;
    }


    export function strToBytes(inStr: string) : Bytes {
        let _TextEncoder = window['TextEncoder'];
        if (_TextEncoder) {
            return new _TextEncoder().encode(inStr);
        }

        let outBuf = [],
            i = 0,
            j = 0,
            s = encodeURI(inStr),
            n = s.length;
        
        while (i < n) {
            let ch = s.charCodeAt(i);
            if (ch == 37) {     // '%'
                let hex = s.substr(i + 1, 2);
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

    export function bytesToStr(inBuf: Bytes) : string {
        let inLen = inBuf.length;
        let outStr = '';

        for (let i = 0; i < inLen; i++) {
            let byte = inBuf[i];
            let hex = byte.toString(16);
            if (byte < 16) {
                hex = '0' + hex;
            }
            outStr += ('%' + hex);
        }
        
        return decodeURIComponent(outStr);
    }

    export function hideDom(el: HTMLElement) {
        el.style.cssText = 'position:absolute;top:-999px';
    }
}
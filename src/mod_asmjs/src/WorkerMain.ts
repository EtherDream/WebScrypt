///<reference path="../../main/src/Const.ts"/>
///<reference path="WorkerChild.ts"/>
///<reference path="../lib/pbkdf2.js"/>
///<reference path="../lib/smix.js"/>


module WorkerMain {

    let mArgP: number,
        mWorkerUrl: string,

        mAsmBuf: ArrayBuffer,
        mAsmU8: Uint8Array,
        mAsmMod = asm_pbkdf2(),

        // 利用类型推导机制，获取 asm.js 模块的实例类型
        mAsmObj = false ? mAsmMod.create(null) : null,

        mPassPtr: number,
        mSaltPtr: number,
        mDkPtr: number,
        mBlksPtr: number,

        mPassLen: number,
        mSaltLen: number,
        mDkLen: number,
        mBlkLen: number,

        mThreads: number,
        mRunning: boolean,
        mWorkerPool: Worker[] = [],

        mIterMax: number,
        mIterCur: number,

        mReadyCounter: number,
        mDoingCounter: number,
        mDoneCounter: number,
        
        mLastNotify: number;

    
    export function config(
        N: number, r: number, P: number,
        thread: number,
        maxPassLen: number, maxSaltLen: number, maxDkLen: number
    ) {
        mBlkLen = 128 * r;        
        mArgP = P;
        mIterMax = P * N * 2;

        mThreads = thread;
        mReadyCounter = 0;

        // pbkdf2 memory alloc
        let ptr = mAsmMod.getHeap();
        
        mPassPtr = ptr;
        ptr += maxPassLen;

        mSaltPtr = ptr;
        ptr += maxSaltLen;

        mDkPtr = ptr;
        ptr += maxDkLen;

        mBlksPtr = ptr;
        ptr += (mBlkLen * P);

        ptr = Math.ceil(ptr / 65536) * 65536;

        // init asm.js module
        if (!mAsmBuf || mAsmBuf.byteLength < ptr) {
            mAsmBuf = new ArrayBuffer(ptr);
            mAsmU8 = new Uint8Array(mAsmBuf);
            mAsmObj = mAsmMod.create(mAsmBuf);
        }

        if (!mWorkerUrl) {
            mWorkerUrl = createWorkerUrl();
        }

        for (let i = 0; i < mThreads; i++) {
            let worker = mWorkerPool[i];
            if (!worker) {
                worker = new Worker(mWorkerUrl);
                worker.onmessage = msgHander;
                worker['tag'] = 0;
                mWorkerPool[i] = worker;
            }
            worker.postMessage({
                cmd: 'config',
                N: N,
                r: r,
            });
        }
    }
    
    export function hash(passBin: Bytes, saltBin: Bytes, dkLen: number) {
        mAsmU8.set(passBin, mPassPtr);
        mAsmU8.set(saltBin, mSaltPtr);

        mPassLen = passBin.length;
        mSaltLen = saltBin.length;
        mDkLen = dkLen;

        mRunning = true;
        mIterCur = 0;
        mDoingCounter = 0;
        mDoneCounter = 0;

        // [B0, B1, ..., Bp] <- PBKDF2(pass, salt)
        mAsmObj._PBKDF2_OneIter(
            mPassPtr, mPassLen,
            mSaltPtr, mSaltLen,
            mBlksPtr, mBlkLen * mArgP
        );
        
        // console.log('smix pre:',
        //     bytesToHex(mAsmU8, mBlksPtr, mBlkLen * mArgP)
        // );

        for (let i = 0; i < mThreads; i++) {
            task(mWorkerPool[i]);
        }
    }
    
    export function stop() {
        mRunning = false;
    }
    
    export function free() {
        mWorkerPool.forEach(w => {
            w.postMessage({
                cmd: 'free'
            });
        });
    }

    export function unload() {
        mWorkerPool.forEach(w => {
            w.terminate();
        });
        mWorkerPool = [];
        mAsmBuf = mAsmU8 = mAsmMod = null;
        URL.revokeObjectURL(mWorkerUrl);
    }

    
    function createWorkerUrl() {
        /**
         CODE GEN：
           (function Child(..) {
              ...
           })();
           function asm_smix() {
              ...
           }
         */
        let code = '(' + Child + ')();' + asm_smix;

        let blob = new Blob([code], {
            type: 'text/javascript'
        });
        
        return URL.createObjectURL(blob);
    }

    function complete() {
        // console.log('smix post:',
        //     bytesToHex(mAsmU8, mBlksPtr, mBlkLen * mArgP)
        // );

        // final hash
        mAsmObj._PBKDF2_OneIter(
            mPassPtr, mPassLen,
            mBlksPtr, mBlkLen * mArgP,
            mDkPtr, mDkLen > 32 ? mDkLen : 32
        );
        
        // pass reference
        let dkBin = new Uint8Array(mAsmBuf, mDkPtr, mDkLen);

        mRunning = false;
        callback('oncomplete', dkBin);
    }


    function msgHander(e: MessageEvent) {
        let worker: Worker = this;
        let msg = e.data;

        // fast case
        if (typeof msg == 'number') {
            if (!mRunning) {
                return;
            }
            worker.postMessage(true);
            
            // progress
            mIterCur += msg;

            let now = Date.now();
            if (now - mLastNotify > 50) {
                callback('onprogress', mIterCur / mIterMax);
            }
            mLastNotify = now;
            return;
        }

        switch (msg.state) {
        case 'done':
            if (!mRunning) {
                return;
            }
            // Bi -> B'i
            let buf = new Uint8Array(msg.output);
            let id = worker['tag'];
            mAsmU8.set(buf, mBlksPtr + mBlkLen * id);

            mIterCur += msg.step;

            if (++mDoneCounter == mArgP) {
                complete();
            } else if (mDoingCounter < mArgP) {
                task(worker);
            }
            break;

        case 'ready':
            if (++mReadyCounter == mThreads) {
                callback('onready');
            }
            break;

        case 'fail':
            callback('onerror', 'memory alloc fail');
            break;
        }
    }

    function task(worker: Worker) {
        let ptrBi = mBlksPtr + mDoingCounter * mBlkLen;
        let bufBi = mAsmBuf.slice(ptrBi, ptrBi + mBlkLen);

        worker['tag'] = mDoingCounter++;
        worker.postMessage({
            cmd: 'task',
            input: bufBi,
        }, [bufBi]); // no copy
    }


    function bytesToHex(inBuf: Bytes, inPtr: number, inLen: number) : string {
        let str = '';
        for (let i = 0; i < inLen; i++) {
            let byte = inBuf[inPtr++];
            let hex = byte.toString(16);
            if (byte < 16) {
                hex = '0' + hex;
            }
            str += hex;
        }
        return str;
    }


    function callback(msg: string, data?) {
        let scrypt = window['scrypt'];
        if (scrypt) {
            scrypt.__asmjs_cb(msg, data);
        }
    }

    callback('onload', WorkerMain);
}
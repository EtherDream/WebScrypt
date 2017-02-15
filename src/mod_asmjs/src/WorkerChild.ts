///<reference path="../lib/smix.js"/>


const Child = function() {
    'use strict';

    const enum CONST {
        INIT_ITER = 262144,
        INTERVAL = 100,
        STAGE2_RATE = 0.7,
    };


    let mPtrB = 64,
        mPtrXYV: number,
        mBlockSize: number,
        mArgN: number,
        mArgR: number,

        mAsmBuf: ArrayBuffer,
        mAsmU32: Uint32Array,
        mAsmU8: Uint8Array,
        mAsmMod = asm_smix(),

        // 利用类型推导机制，获取 asm.js 模块的实例类型
        mAsmObj = false ? mAsmMod.create(null) : null,

        mProgPos: number,
        mProgStep: number,
        mFirstStage: boolean;


    // Worker's postMessage
    const postMessage = <any> self.postMessage;
    const getTick = Date.now;


    function prehot() {
        // test data
        // let s1 = mPtrB >> 2;
        // let s2 = mPtrB + mBlockSize >> 2;
        // let k = getTick();

        // for (let i = s1; i < s2; i++) {
        //     k = (k * 13) >>> 0;
        //     mAsmU32[i] = k;
        // }

        // first run
        // mAsmObj._SMix(mArgN, mArgR, mPtrB, mPtrXYV, 0, 0, 8192);
        // mAsmObj._SMix(mArgN, mArgR, mPtrB, mPtrXYV, 1, 0, 8192);
    }


    function config(N: number, r: number) {
        mArgN = N;
        mArgR = r;
        mBlockSize = 128 * r;
        mPtrXYV = mPtrB + mBlockSize;

        let size = mPtrB + mBlockSize * (3 + N);

        // 空间必须是 16M 的整数倍
        let need = Math.ceil(size / 16777216) * 16777216;

        if (!mAsmBuf || mAsmBuf.byteLength < need) {
            try {
                mAsmBuf = new ArrayBuffer(need);
            } catch (err) {
                return false;
            }
            // mAsmU32 = new Uint32Array(mAsmBuf);
            mAsmU8 = new Uint8Array(mAsmBuf);

            // create instance
            mAsmObj = mAsmMod.create(mAsmBuf);
            prehot();
        }
        return true;
    }


    function start(input: ArrayBuffer) {
        let buf = new Uint8Array(input);
        mAsmU8.set(buf, mPtrB);
        
        mProgStep = CONST.INIT_ITER / mArgR;
        mProgPos = 0;
        mFirstStage = true;
    }


    function setRate(p: number) {
        // 保持为 2 的倍数
        mProgStep = (mProgStep * p >> 1) << 1;
    }

    function advance() {
        let stp = mProgStep;
        let beg = mProgPos;
        let end = beg + stp;
        let last = 0;
        let t;

        if (end >= mArgN) {
            end = mArgN;
            stp = end - beg;
            last = mFirstStage ? 1 : 2;
        }
        
        if (last != 2) {
            // 在计算前通知主线程，并发布下一个任务，减少消息通信的间隔
            postMessage(stp);
        }

        if (last == 0) {
            t = getTick();
        }
        mAsmObj._SMix(mArgN, mArgR, mPtrB, mPtrXYV, mFirstStage ? 0 : 1, beg, end);

        switch (last) {
        case 0:
            t = getTick() - t;
            mProgPos = end;

            // 根据当前的计算速度，调整下一次的迭代次数
            // 使计算时间保持在 INTERVAL ms 左右
            setRate(CONST.INTERVAL / t);
            break;

        case 1:
            mProgPos = 0;
            mFirstStage = false;
            // SMix 第二步的迭代耗时更大
            setRate(CONST.STAGE2_RATE);
            break;

        case 2:
            // complete notify
            let output = mAsmBuf.slice(mPtrB, mPtrB + mBlockSize);
            postMessage({
                state: 'done',
                step: stp,
                output: output,
            }, [output]);
            break;
        }
    }


    function onMessage(e: MessageEvent) {
        let msg = e.data;

        // fast case
        if (msg === true) {
            advance();
            return;
        }

        switch (msg.cmd) {
        // case 'advance':
        //     advance();
        //     break;

        case 'task':
            start(msg.input);
            advance();
            break;

        case 'config':
            let success = config(msg.N, msg.r);
            postMessage({
                state: success ? 'ready' : 'fail',
            });
            break;

        case 'free':
            mAsmObj = mAsmU8 = mAsmBuf = null;
            break;
        }
    }
    
    addEventListener('message', onMessage);
};

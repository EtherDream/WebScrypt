package
{
    import com.etherdream.scrypt.*;
    import com.etherdream.webworker.*;
    
    import flash.utils.ByteArray;
    import flash.utils.getTimer;

    
    public class Child extends WebWorkerContext {
        
        static private const
            DEFAULT_ITER: uint = 131072,
            INTERVAL: uint = 200;  // ms
        
        private var
            mPtrBXYV: uint,
            mBlkLen: uint,
            mArgN: uint,
            mArgR: uint,
            mCurSize: uint,
            mIOBuf: ByteArray,
            mProgPos: uint,
            mProgStep: uint,
            mFirstStage: Boolean;
            
        
        public function Child() {
            mIOBuf = getSharedObject('buf') as ByteArray;
            addEventListener('message', msgHander);
        }
        
        private function config(N: uint, r: uint) : void {
            mArgN = N;
            mArgR = r;
            mBlkLen = 128 * r;
            
            var size: uint = mBlkLen * (3 + N);
            if (size > mCurSize) {
                if (mPtrBXYV != 0) {
                    CModule.free(mPtrBXYV);
                }
                mPtrBXYV = CModule.malloc(size);
                mCurSize = size;
            }
        }
        
        private function start(input: ByteArray) : void {
            // input data -> CModule
            mIOBuf.position = 0;
            CModule.writeBytes(mPtrBXYV, mBlkLen, mIOBuf);
            
            mProgStep = DEFAULT_ITER / mArgR;
            mProgPos = 0;
            mFirstStage = true;
        }
        
        private function setRate(p: Number) : void {
            mProgStep = (mProgStep * p >> 1) << 1;
        }
        
        private function advance() : void {
            var stp: uint = mProgStep
            var beg: uint = mProgPos;
            var end: uint = beg + stp;
            var last: uint = 0;
            var t: uint;
            
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
                t = getTimer();
            }
            
            C_SMix(mArgN, mArgR, mPtrBXYV, mPtrBXYV + mBlkLen,
                mFirstStage ? 0 : 1, beg, end);
            
            switch (last) {
            case 0:
                t = getTimer() - t;
                mProgPos = end;
                
                // 根据当前的计算速度，调整下一次的迭代次数
                // 使计算时间保持在 INTERVAL ms 左右
                setRate(INTERVAL / t);
                break;
            
            case 1:
                mProgPos = 0;
                mFirstStage = false;
                // SMix 第二步的迭代耗时更大
                setRate(0.7);
                break;
            
            case 2:
                // complete notify
                // CModule -> output data
                mIOBuf.position = 0;
                CModule.readBytes(mPtrBXYV, mBlkLen, mIOBuf);
                
                postMessage({
                    state: 'done',
                    step: stp
                });
                break;
            }
        }
        
        private function msgHander(e: WebWorkerEvent) : void {
            var msg: * = e.data;
            
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
                config(msg.N, msg.r);
                postMessage({
                    state: 'ready'
                });
                break;
            
            case 'free':
                mCurSize = 0;
                CModule.free(mPtrBXYV);
                break;
            }
        }
    }
}

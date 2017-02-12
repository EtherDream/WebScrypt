package {
	// https://github.com/EtherDream/webworker.swc
	import com.etherdream.webworker.*;
	import com.etherdream.scrypt.*;
	
	import flash.external.ExternalInterface;
	import flash.system.Security;
	import flash.utils.ByteArray;
	import flash.utils.getTimer;

	
	public class Main {
		
		static private const CALLBACK: String = 'scrypt.__flash_cb';
		
		private var
			mArgP: uint,
			mWorkerBytes: ByteArray,
			
			mPassPtr: uint,
			mSaltPtr: uint,
			mDkPtr: uint,
			mBlksPtr: uint,
			
			mPassLen: uint,
			mSaltLen: uint,
			mDkLen: uint,
			mBlkLen: uint,
			
			mThreads: uint,
			mRunning: Boolean,
			mWorkerPool: Array = [],
			
			mIterMax: uint,
			mIterCur: uint,
			
			mReadyCounter: uint,
			mDoingCounter: uint,
			mDoneCounter: uint,
			
			mChunkPtr: uint,
			mChunkLen: uint,
			mLastNotify: uint;
		
		
			
		public function Main(workerBytes: ByteArray) {
			Security.allowDomain('*');			
			mWorkerBytes = workerBytes;
			
			ExternalInterface.addCallback('config', config);
			ExternalInterface.addCallback('hash', hash);
			ExternalInterface.addCallback('cancel', cancel);
			ExternalInterface.addCallback('free', free);
			
			callback('onload');
		}
		
		
		private function log(str: *) : void {
			ExternalInterface.call('console.log', str);
		}
		
		
		private function callback(msg: String, ... args) : void {
			switch (args.length) {
			case 0:
				ExternalInterface.call(CALLBACK, msg);
				break;
			case 1:
				ExternalInterface.call(CALLBACK, msg, args[0]);
				break;
			// ...
			}
		}
		
		
		private function cancel() : void {
			mRunning = false;
		}
		
		
		private function free() : void {
			mWorkerPool.forEach(function(w: WebWorker) : void {
				w.postMessage({
					cmd: 'free'
				});
			});
		}
		
		
		private function config(
			N: uint, r: uint, P: uint,
			thread: uint,
			maxPassLen: uint, maxSaltLen: uint, maxDkLen: uint
		) : void {
			mBlkLen = 128 * r;
			mArgP = P;
			mIterMax = P * N * 2;
			
			mThreads = thread;
			mReadyCounter = 0;
			
			// pbkdf2 memory alloc
			var size: uint = maxPassLen + maxSaltLen + maxDkLen + (mBlkLen * P);
			if (size > mChunkLen) {
				if (mChunkPtr) {
					CModule.free(mChunkPtr);
				}
				mChunkPtr = CModule.malloc(size);
			}
			
			var ptr: uint = mChunkPtr;
			
			mPassPtr = ptr;
			ptr += maxPassLen;
			
			mSaltPtr = ptr;
			ptr += maxSaltLen;
			
			mDkPtr = ptr;
			ptr += maxDkLen;
			
			mBlksPtr = ptr;
			
			
			for (var i: uint = 0; i < thread; i++) {
				var worker: WebWorker = mWorkerPool[i];
				if (!worker) {
					var buf: ByteArray = new ByteArray();
					buf['shareable'] = true;
					
					worker = new WebWorker(mWorkerBytes);
					worker.setSharedObject('buf', buf);
					worker.addEventListener('message', msgHander);
					worker.tag = {
						id: 0,
						buf: buf
					};
					mWorkerPool[i] = worker;
				}
				worker.postMessage({
					cmd: 'config',
					N: N,
					r: r
				});
			}
		}
		
		
		private function hash(passHex: String, saltHex: String, dkLen: Number) : void {
			mPassLen = hexToByte(passHex, CModule.ram, mPassPtr);
			mSaltLen = hexToByte(saltHex, CModule.ram, mSaltPtr);
			mDkLen = dkLen;
			
			mRunning = true;
			mIterCur = 0;
			mDoingCounter = 0;
			mDoneCounter = 0;

			
			// [B0, B1, ..., Bp] <- PBKDF2(pass, salt)
			C_PBKDF2_OneIter(
				mPassPtr, mPassLen,
				mSaltPtr, mSaltLen,
				mBlksPtr, mBlkLen * mArgP);
			
//			log('smix pre:' +
//				bytesToHex(CModule.ram, mBlksPtr, mBlkLen * mArgP)
//			);
			
			for (var i: uint = 0; i < mThreads; i++) {
				task(mWorkerPool[i]);
			}
		}
		
		
		private function complete() : void {
//			log('smix post:' +
//				bytesToHex(CModule.ram, mBlksPtr, mBlkLen * mArgP)
//			);
			
			// final hash
			C_PBKDF2_OneIter(
				mPassPtr, mPassLen,
				mBlksPtr, mBlkLen * mArgP,
				mDkPtr, mDkLen > 32 ? mDkLen : 32
			);
			
			var dkHex: String = bytesToHex(CModule.ram, mDkPtr, mDkLen);
			
			mRunning = false;
			callback('oncomplete', dkHex);
		}
		
		
		private function msgHander(e: WebWorkerEvent) : void {
			var worker: WebWorker = e.target as WebWorker;
			var msg: * = e.data;
			
			// fast case
			if (typeof msg == 'number') {
				if (!mRunning) {
					return;
				}
				worker.postMessage(true);
				
				// progress
				mIterCur += msg;
				
				var now: uint = getTimer();
				if (now - mLastNotify > 100) {
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
				var ptr: uint = mBlksPtr + mBlkLen * worker.tag.id;
				var buf: ByteArray = worker.tag.buf;
				buf.position = 0;
				CModule.writeBytes(ptr, mBlkLen, buf);
				
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
			}
		}
		
		
		private function task(worker: WebWorker) : void {
			var ptrBi: uint = mBlksPtr + mDoingCounter * mBlkLen;
			var bufBi: ByteArray = worker.tag.buf;
			
			bufBi.position = 0;
			CModule.readBytes(ptrBi, mBlkLen, bufBi);
			
			worker.tag.id = mDoingCounter++;
			worker.postMessage({
				cmd: 'task'
			});
		}
		
		
		private function bytesToHex(inBuf: ByteArray, inPtr: uint, inLen: uint) : String {
			var outStr: String = '';
			
			for(var i: uint = 0; i < inLen; i++) {
				var byte: uint = inBuf[inPtr + i];
				var hex: String = byte.toString(16);
				if (byte < 16) {
					hex = '0' + hex;
				}
				outStr += hex;
			}
			return outStr;
		}
		
		
		private function hexToByte(inStr: String, outBuf: ByteArray, outPtr: uint) : uint {
			var outLen: uint = inStr.length / 2;
			
			for (var i: uint = 0; i < outLen; i++) {
				outBuf[outPtr++] = parseInt(inStr.substr(i * 2, 2), 16);
			}
			return outLen;
		}
	}
}

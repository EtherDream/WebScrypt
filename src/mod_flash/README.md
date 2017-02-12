# scrypt flash

该模块为不支持 asm.js 的浏览器提供兼容方案。

虽然 Flash 的性能远不如 asm.js（只有 60% 左右），但相比低版本浏览器的 JS 引擎还是快不少。

本项目使用 [CrossBridge](https://github.com/adobe-flash/crossbridge) 编译器（开源版的 FlasCC，更早的版本叫 Alchemy），将 C 代码编译成 `lib/scrypt.swc`，供 ActionScript 调用。

CrossBridge 支持 pthread 库，可无需关心 Flash 的多线程实现细节，直接生成最终的 SWF 文件。

但是直接生成的 SWF 文件较大，性能也并没有变高（可通过 make pthread_test 测试）。因此本项目采用了类似 JS 的模型，手动控制多线程。

多线程使用 `lib/webworker.swc` 实现。该库封装了一个 HTML5 风格的 Worker，因此可以较大程度共享 JS 模块的代码逻辑。具体源码位于：[webworker.swc](https://github.com/EtherDream/webworker.swc) 项目。

Flash Player 13+ 支持 LZMA 压缩格式的 SWF，但编译器默认没有开启，这里使用工具 [swf2lzma](https://github.com/jspiro/swf2lzma) 实现压缩，可减少 25% 左右的体积。

由于使用了 Shared ByteArray，因此最终 SWF 必须在 Flash Player 18+ 才能执行。

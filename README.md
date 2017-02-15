# WebScrypt

一个浏览器版的 scrypt 算法，性能高、体积小。

该脚本适用于网站注册、登录等场合的口令加固。旨在不增加服务端硬件投入的前提下，将拖库后暴力破解口令的难度提升多个数量级。此外，对撞库攻击、隐私嗅探也能起到一定的防护。


## scrypt 简介

scrypt 是一种密码学 Hash 函数，专门用于处理口令。

相比 PBKDF2、bcrypt 只有`时间成本`，scrypt 还可设定`空间成本`，该特征能使 GPU 等硬件设备破解 Hash 时，瓶颈出现在内存上。

另外 scrypt 支持`并发维度`，可充分利用多线程提高工作量，使破解难度成倍增加。


## 前端计算

口令 Hash 函数的计算成本，决定了暴力破解的难度。但过高的成本，也会给服务器带来压力。通常只能在性能和安全之间折中。

如今浏览器的性能有了极大提升，因此可将口令 Hash 在前端计算，用其结果 dk 取代明文口令提交；后端收到 dk 后使用普通快速的 Hash 函数进行处理，即可安全存入数据库中。

![](../../raw/master/doc/clienthash1.png)

未来即使被拖库，攻击者也是无法通过 hash 值破解 dk 的。口令虽能破解，但需花费很大的成本。

![](../../raw/master/doc/clienthash2.png)

使用这种方案，既能减轻服务端的计算压力，又可获得高强度的安全。（[详细](https://www.cnblogs.com/index-html/p/frontend_kdf.html)）


## 演示

* [基本功能](example/basic/)

* [登录演示](example/login/)


## WebScrypt API

[使用文档](doc/api.md)


## 探讨

* [前端 Hash 能否对抗不安全的通信](doc/client-hash-via-insecure-network)



## 更新中

* 细节完善

* 增加 PNaCl、WebAssembly 模块

* 各种浏览器的测试案例、性能对比图表

* 应用案例

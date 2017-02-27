
# 为何不用 argon2

2015 年 P-H-C 胜出者 [argon2](https://github.com/P-H-C/phc-winner-argon2)，是目前最新的口令 Hash 函数。OWASP 在 [Password Storage Cheat Sheet](https://www.owasp.org/index.php/Password_Storage_Cheat_Sheet) 中，也推荐开发者首选该算法。

既然 argon2 比 scrypt 更先进，为什么本项目不使用？事实上，之前已有人尝试将 [argon2 移植到浏览器](https://github.com/antelle/argon2-browser)，但遇到一个棘手的问题：argon2 大量使用了 64 位整数计算，而 JavaScript 并没有原生的 64 位整数，只能通过模拟实现，因此效率非常低。（asm.js 作为 JS 的子集自然也不支持。另外 Flash 虚拟机 AVM2 同样不支持 64 位整数）

所以算法未必越新越好，还得看实际运行的环境，能否提供充足的支持。

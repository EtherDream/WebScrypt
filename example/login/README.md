## 简介

演示 scrypt 在前端登录的应用。

为简单起见，本案例 scrypt 参数是固定的 —— 选取用户名作为盐，时间成本、空间成本、并行维度都是固定的。

另外后端也没有使用数据库，而是直接记录在 `db.json` 文件里。

登录成功后，你可以看到用户对应的一些隐私信息，里面有红包哦：）


## 演示

在线演示：http://www.etherdream.com/webscrypt/example/login/

如果无法访问，可下载到本地运行：

```
git clone https://github.com/EtherDream/webscrypt.git
cd webscrypt
php -S 127.0.0.1:8080
```

访问 http://127.0.0.1:8080/example/login/ 即可本地测试。

由于程序和数据都是公开的（相当于已被拖库），因此不推荐在线撞库破解。如果非要撞库，请在本地进行。

# WebScrypt API

## 使用

```html
<script src="release/scrypt.js"></script>
```

## 方法

### getAvailableMod

获得可用的模块列表

参数：无

返回：string[]

案例：

```javascript
scrypt.getAvailableMod();
// ["asmjs", "flash"]
```

备注：scrypt.js 本身只是个加载器，实际的计算程序则位于外部模块中。这样能根据不同的浏览器，选择最合适的计算方案。


### setResPath

设置模块资源的路径

参数：

* path: string

返回：无

案例：

```html
<!-- foo.com -->
<script src="//foo-cdn.com/scrypt-release/scrypt.js"></script>
<script>
  scrypt.setResPath('//foo-cdn.com/scrypt-release/asset');
</script>
```

备注：该路径即 `release/asset` 目录最终所在的 URL。


### load

加载使用的模块。

参数：

* mod: string (可选) 

| 模块   | 要求                | 相应资源
|:-----:|:-------------------|---------------------|
| asmjs | 支持 asm.js 的浏览器 | RES_PATH/asmjs.js   |
| flash | Flash 版本大于 18    | RES_PATH/flash.swf |


如果参数为空，系统将自动选择最合适的模块。（推荐）


案例：

```javascript
scrypt.load();
```

备注：加载完成后会触发 `onload` 回调。


### config

配置算法所需的参数

参数：

* param: object

* opt: object（可选）

* test: boolean（可选，默认 false）


#### param

* N: number

* r: number 

* P: number


##### opt

* maxPassLen: number（可选，默认 64）

* maxSaltLen: number（可选，默认 64）

* maxDkLen: number（可选，默认 64）

* maxThread: number（可选，默认 1）


##### test

设置为 true 时，仅测试参数是否合法，不会真正分配资源。


案例：

```javascript
var param = {
    N: 16384,   // 时空成本
    r: 8,       // 块大小
    P: 4        // 并发维度
};

var opt = {
    maxPassLen: 32, // 缓冲区大小分配
    maxSaltLen: 32,
    maxDkLen: 32,
    maxThread: 2    // 最多使用的线程数
};

try {
    scrypt.config(param, opt, true);
} catch (err) {
    console.warn('config err: ', err);
}
```

备注：该方法会创建相应数量的 Worker 并进行内存分配，做 `hash()` 的前期准备工作。配置完成后会触发 `onready` 回调。

注意，实际创建的 Worker 数量未必就是 maxThread 个，系统会根据参数 P 选择最合理的数量。例如 P = 8，maxThread = 6 时，开启 4 个 Worker 就够了。


### strToBin

辅助功能。字符串 → 二进制数组。

参数：

* str: string

返回：Bytes （高版本浏览器使用 `Uint8Array`，低版本使用 `Array`）

案例：

```javascript
scrypt.strToBin('hello');
// [104, 101, 108, 108, 111]

scrypt.strToBin('你好');
// [228, 189, 160, 229, 165, 189]

scrypt.strToBin('😀');
// [240, 159, 152, 128]
```


### binToStr

辅助功能。二进制数组 → 字符串。

参数：

* bin: Bytes

返回：string

案例：

```javascript
scrypt.binToStr([104, 101, 108, 108, 111]);
// "hello"

scrypt.binToStr([228, 189, 160, 229, 165, 189]);
// "你好"

scrypt.binToStr([240, 159, 152, 128]);
// "😀"
```

备注：解码失败会抛出异常。


### hexToBin

辅助功能。16 进制字符串 → 二进制数组

参数：

* hex: string

返回：Bytes

案例：

```javascript
scrypt.hexToBin('0001020340ff');
// [0, 1, 2, 3, 64, 255]
```


### binToHex

辅助功能。二进制数组 → 16 进制字符串

参数：

* bin: Bytes

返回：string

案例：

```javascript
scrypt.binToHex([0, 1, 2, 3, 64, 255]);
// "0001020340ff"
```


### hash

计算口令和盐的 hash 值。

参数：

* pass: Bytes

* salt: Bytes

* dkLen: number

返回：无

案例：

```javascript
var pass = scrypt.strToBin('iloveyou');
var salt = scrypt.hexToBin('bc9064f2e2f978ed');

scrypt.hash(pass, salt, 32);
```

备注：计算进度通过 `onprogress` 更新；计算完成会触发 `oncomplete` 回调。

注意，`pass`、`salt` 以及 `dkLen` 不能超过 `config()` 方法中对应的最大长度，否则会抛出错误。


### stop

停止当前的计算

参数：无

返回：无

案例：

```javascript
txtPassword.onchange = function() {
    scrypt.stop();
    scrypt.hash(this.value, salt);
};
```

备注：该方法不会强行关闭 Worker，而是在计算间歇中令其停止。


### unload

清理 Worker 并释放内存。

参数：无

返回：无

案例：

```javascript
function onLoginSuccess() {
    scrypt.unload();
}
```

备注：为了提高重复运行的效率，hash() 执行后不会自动清理资源，而是通过该方法手动清理。

由于网页关闭后浏览器会自动清理资源，因此通常不必调用该方法。但对于长时间运行的页面，例如 Single-Page App，及时清理还是有必要的。

清理后若要继续使用，则需重新 load()、config()。



## 回调

### onload

`load` 方法加载完成时触发。

参数：无

案例：

```javascript
scrypt.onload = function() {
    console.log('loaded');
};
```


### onready

`config` 方法完成时触发。

参数：无

案例：

```javascript
scrypt.onready = function() {
    console.log('ready');
    scrypt.hash(P, S);
};
```

备注：此时已准备就绪，可调用 `hash()`。


### onerror

资源加载失败、内存申请失败等错误发生时触发。

参数：

* err: string

案例：

```javascript
scrypt.onerror = function(err) {
    console.warn('scrypt err:', err);
};
```


### onprogress

计算进度更新时触发。

参数：

* percent: number

案例：

```javascript
scrypt.onprogress = function(percent) {
    console.log('prog', (percent * 100) + '%');
};
```


### oncomplete

计算完成时触发。

参数：

* dk: Bytes

案例：

```javascript
scrypt.oncomplete = function(dk) {
    console.log('done', scrypt.binToHex(dk));
};
```

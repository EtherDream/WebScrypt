// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('The provided Module[\'ENVIRONMENT\'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = console.log;
  if (!Module['printErr']) Module['printErr'] = console.warn;

  var nodeFS;
  var nodePath;

  Module['read'] = function read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
      } else {
        onerror();
      }
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.warn(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      // optimize away arguments usage in common cases
      if (sig.length === 1) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func);
        };
      } else if (sig.length === 2) {
        sigCache[func] = function dynCall_wrapper(arg) {
          return Runtime.dynCall(sig, func, [arg]);
        };
      } else {
        // general case
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
        };
      }
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = HEAP32[DYNAMICTOP_PTR>>2];var end = (((ret + size + 15)|0) & -16);HEAP32[DYNAMICTOP_PTR>>2] = end;if (end >= TOTAL_MEMORY) {var success = enlargeMemory();if (!success) {HEAP32[DYNAMICTOP_PTR>>2] = ret;return 0;}}return ret;},
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try { func = eval('_' + ident); } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = Runtime.stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface.
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }

  // sources of useful functions. we create this lazily as it can trigger a source decompression on this entire file
  var JSsource = null;
  function ensureJSsource() {
    if (!JSsource) {
      JSsource = {};
      for (var fun in JSfuncs) {
        if (JSfuncs.hasOwnProperty(fun)) {
          // Elements of toCsource are arrays of three items:
          // the code, and the return value
          JSsource[fun] = parseJSFunc(JSfuncs[fun]);
        }
      }
    }
  }

  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      ensureJSsource();
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=(' + convertCode.returnValue + ');';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      ensureJSsource();
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}


function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var s = func.substr(1);
      var len = lengthBytesUTF8(s)+1;
      var buf = _malloc(len);
      stringToUTF8(s, buf, len);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed
    } catch(e) {
      // ignore problems here
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
    // failure when using libcxxabi, don't demangle
    return func;
  }
  Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var buffer;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;



function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}


function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var WASM_PAGE_SIZE = 64 * 1024;

var totalMemory = WASM_PAGE_SIZE;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024;
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
} else {
  // Use a WebAssembly memory where available
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
function writeStringToMemory(string, buffer, dontAddNull) {
  Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var lastChar, end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

if (!Math['trunc']) Math['trunc'] = function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
};
Math.trunc = Math['trunc'];

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;





// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 2912;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([152,47,138,66,145,68,55,113,207,251,192,181,165,219,181,233,91,194,86,57,241,17,241,89,164,130,63,146,213,94,28,171,152,170,7,216,1,91,131,18,190,133,49,36,195,125,12,85,116,93,190,114,254,177,222,128,167,6,220,155,116,241,155,193,193,105,155,228,134,71,190,239,198,157,193,15,204,161,12,36,111,44,233,45,170,132,116,74,220,169,176,92,218,136,249,118,82,81,62,152,109,198,49,168,200,39,3,176,199,127,89,191,243,11,224,198,71,145,167,213,81,99,202,6,103,41,41,20,133,10,183,39,56,33,27,46,252,109,44,77,19,13,56,83,84,115,10,101,187,10,106,118,46,201,194,129,133,44,114,146,161,232,191,162,75,102,26,168,112,139,75,194,163,81,108,199,25,232,146,209,36,6,153,214,133,53,14,244,112,160,106,16,22,193,164,25,8,108,55,30,76,119,72,39,181,188,176,52,179,12,28,57,74,170,216,78,79,202,156,91,243,111,46,104,238,130,143,116,111,99,165,120,20,120,200,132,8,2,199,140,250,255,190,144,235,108,80,164,247,163,249,190,242,120,113,198,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,96,7,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,1,0,0,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);





/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    } 
  Module["_sbrk"] = _sbrk;

   
  Module["_memset"] = _memset;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function ___lock() {}

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _abort() {
      Module['abort']();
    }

   
  Module["_pthread_self"] = _pthread_self;

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___unlock() {}

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
/* flush anything remaining in the buffer during shutdown */ __ATEXIT__.push(function() { var fflush = Module["_fflush"]; if (fflush) fflush(0); var printChar = ___syscall146.printChar; if (!printChar) return; var buffers = ___syscall146.buffers; if (buffers[1].length) printChar(1, 10); if (buffers[2].length) printChar(2, 10); });;
DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC);

STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory



function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_vi": invoke_vi, "_pthread_cleanup_pop": _pthread_cleanup_pop, "___lock": ___lock, "_abort": _abort, "___setErrNo": ___setErrNo, "___syscall6": ___syscall6, "___syscall140": ___syscall140, "_pthread_cleanup_push": _pthread_cleanup_push, "_emscripten_memcpy_big": _emscripten_memcpy_big, "___syscall54": ___syscall54, "___unlock": ___unlock, "___syscall146": ___syscall146, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var DYNAMICTOP_PTR=env.DYNAMICTOP_PTR|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;
  var tempRet0 = 0;

  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_max=global.Math.max;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var enlargeMemory=env.enlargeMemory;
  var getTotalMemory=env.getTotalMemory;
  var abortOnCannotGrowMemory=env.abortOnCannotGrowMemory;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_vi=env.invoke_vi;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var ___lock=env.___lock;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var ___syscall6=env.___syscall6;
  var ___syscall140=env.___syscall140;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var ___syscall146=env.___syscall146;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function _malloc($0) {
 $0 = $0 | 0;
 var $$$4349$i = 0, $$$i = 0, $$0 = 0, $$0$i$i = 0, $$0$i$i$i = 0, $$0$i17$i = 0, $$0$i18$i = 0, $$01$i$i = 0, $$0187$i = 0, $$0189$i = 0, $$0190$i = 0, $$0191$i = 0, $$0197 = 0, $$0199 = 0, $$0206$i$i = 0, $$0207$i$i = 0, $$0211$i$i = 0, $$0212$i$i = 0, $$024370$i = 0, $$0286$i$i = 0, $$0287$i$i = 0, $$0288$i$i = 0, $$0294$i$i = 0, $$0295$i$i = 0, $$0340$i = 0, $$0342$i = 0, $$0343$i = 0, $$0345$i = 0, $$0351$i = 0, $$0356$i = 0, $$0357$i = 0, $$0359$i = 0, $$0360$i = 0, $$0366$i = 0, $$1194$i = 0, $$1196$i = 0, $$124469$i = 0, $$1290$i$i = 0, $$1292$i$i = 0, $$1341$i = 0, $$1346$i = 0, $$1361$i = 0, $$1368$i = 0, $$1372$i = 0, $$2247$ph$i = 0, $$2253$ph$i = 0, $$2353$i = 0, $$3$i = 0, $$3$i$i = 0, $$3$i201 = 0, $$3348$i = 0, $$3370$i = 0, $$4$lcssa$i = 0, $$413$i = 0, $$4349$lcssa$i = 0, $$434912$i = 0, $$4355$$4$i = 0, $$4355$ph$i = 0, $$435511$i = 0, $$5256$i = 0, $$723947$i = 0, $$748$i = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i20$iZ2D = 0, $$pre$phi$i206Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi10$i$iZ2D = 0, $$pre$phiZ2D = 0, $1 = 0, $1004 = 0, $1007 = 0, $1008 = 0, $101 = 0, $102 = 0, $1026 = 0, $1028 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1045 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $108 = 0, $112 = 0, $114 = 0, $115 = 0, $117 = 0, $119 = 0, $121 = 0, $123 = 0, $125 = 0, $127 = 0, $129 = 0, $134 = 0, $14 = 0, $140 = 0, $143 = 0, $146 = 0, $149 = 0, $150 = 0, $151 = 0, $153 = 0, $156 = 0, $158 = 0, $16 = 0, $161 = 0, $163 = 0, $166 = 0, $169 = 0, $17 = 0, $170 = 0, $172 = 0, $173 = 0, $175 = 0, $176 = 0, $178 = 0, $179 = 0, $18 = 0, $184 = 0, $185 = 0, $19 = 0, $193 = 0, $198 = 0, $20 = 0, $202 = 0, $208 = 0, $215 = 0, $219 = 0, $228 = 0, $229 = 0, $231 = 0, $232 = 0, $236 = 0, $237 = 0, $245 = 0, $246 = 0, $247 = 0, $249 = 0, $250 = 0, $255 = 0, $256 = 0, $259 = 0, $261 = 0, $264 = 0, $269 = 0, $27 = 0, $276 = 0, $286 = 0, $290 = 0, $296 = 0, $30 = 0, $301 = 0, $304 = 0, $308 = 0, $310 = 0, $311 = 0, $313 = 0, $315 = 0, $317 = 0, $319 = 0, $321 = 0, $323 = 0, $325 = 0, $335 = 0, $336 = 0, $338 = 0, $34 = 0, $347 = 0, $349 = 0, $352 = 0, $354 = 0, $357 = 0, $359 = 0, $362 = 0, $365 = 0, $366 = 0, $368 = 0, $369 = 0, $37 = 0, $371 = 0, $372 = 0, $374 = 0, $375 = 0, $380 = 0, $381 = 0, $386 = 0, $389 = 0, $394 = 0, $398 = 0, $404 = 0, $41 = 0, $411 = 0, $415 = 0, $423 = 0, $426 = 0, $427 = 0, $428 = 0, $432 = 0, $433 = 0, $439 = 0, $44 = 0, $444 = 0, $445 = 0, $448 = 0, $450 = 0, $453 = 0, $458 = 0, $464 = 0, $466 = 0, $468 = 0, $47 = 0, $470 = 0, $487 = 0, $489 = 0, $49 = 0, $496 = 0, $497 = 0, $498 = 0, $50 = 0, $506 = 0, $508 = 0, $509 = 0, $511 = 0, $52 = 0, $520 = 0, $524 = 0, $526 = 0, $527 = 0, $528 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $546 = 0, $548 = 0, $549 = 0, $555 = 0, $557 = 0, $559 = 0, $56 = 0, $564 = 0, $566 = 0, $568 = 0, $569 = 0, $570 = 0, $578 = 0, $579 = 0, $58 = 0, $582 = 0, $586 = 0, $589 = 0, $591 = 0, $597 = 0, $6 = 0, $60 = 0, $601 = 0, $605 = 0, $614 = 0, $615 = 0, $62 = 0, $621 = 0, $624 = 0, $627 = 0, $629 = 0, $634 = 0, $64 = 0, $640 = 0, $645 = 0, $646 = 0, $647 = 0, $653 = 0, $654 = 0, $655 = 0, $659 = 0, $67 = 0, $670 = 0, $675 = 0, $676 = 0, $678 = 0, $684 = 0, $686 = 0, $69 = 0, $690 = 0, $696 = 0, $7 = 0, $70 = 0, $700 = 0, $706 = 0, $708 = 0, $71 = 0, $714 = 0, $718 = 0, $719 = 0, $72 = 0, $724 = 0, $73 = 0, $730 = 0, $735 = 0, $738 = 0, $739 = 0, $742 = 0, $744 = 0, $746 = 0, $749 = 0, $760 = 0, $765 = 0, $767 = 0, $77 = 0, $770 = 0, $772 = 0, $775 = 0, $778 = 0, $779 = 0, $780 = 0, $782 = 0, $784 = 0, $785 = 0, $787 = 0, $788 = 0, $793 = 0, $794 = 0, $8 = 0, $80 = 0, $803 = 0, $808 = 0, $811 = 0, $812 = 0, $818 = 0, $826 = 0, $832 = 0, $835 = 0, $836 = 0, $837 = 0, $84 = 0, $841 = 0, $842 = 0, $848 = 0, $853 = 0, $854 = 0, $857 = 0, $859 = 0, $862 = 0, $867 = 0, $87 = 0, $873 = 0, $875 = 0, $877 = 0, $878 = 0, $896 = 0, $898 = 0, $9 = 0, $905 = 0, $906 = 0, $907 = 0, $914 = 0, $918 = 0, $92 = 0, $922 = 0, $924 = 0, $93 = 0, $930 = 0, $931 = 0, $933 = 0, $934 = 0, $938 = 0, $943 = 0, $944 = 0, $945 = 0, $95 = 0, $951 = 0, $958 = 0, $96 = 0, $963 = 0, $966 = 0, $967 = 0, $968 = 0, $972 = 0, $973 = 0, $979 = 0, $98 = 0, $984 = 0, $985 = 0, $988 = 0, $990 = 0, $993 = 0, $998 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $1 = sp;
 do if ($0 >>> 0 < 245) {
  $6 = $0 >>> 0 < 11 ? 16 : $0 + 11 & -8;
  $7 = $6 >>> 3;
  $8 = HEAP32[297] | 0;
  $9 = $8 >>> $7;
  if ($9 & 3 | 0) {
   $14 = ($9 & 1 ^ 1) + $7 | 0;
   $16 = 1228 + ($14 << 1 << 2) | 0;
   $17 = $16 + 8 | 0;
   $18 = HEAP32[$17 >> 2] | 0;
   $19 = $18 + 8 | 0;
   $20 = HEAP32[$19 >> 2] | 0;
   do if (($16 | 0) == ($20 | 0)) HEAP32[297] = $8 & ~(1 << $14); else {
    if ($20 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
    $27 = $20 + 12 | 0;
    if ((HEAP32[$27 >> 2] | 0) == ($18 | 0)) {
     HEAP32[$27 >> 2] = $16;
     HEAP32[$17 >> 2] = $20;
     break;
    } else _abort();
   } while (0);
   $30 = $14 << 3;
   HEAP32[$18 + 4 >> 2] = $30 | 3;
   $34 = $18 + $30 + 4 | 0;
   HEAP32[$34 >> 2] = HEAP32[$34 >> 2] | 1;
   $$0 = $19;
   STACKTOP = sp;
   return $$0 | 0;
  }
  $37 = HEAP32[299] | 0;
  if ($6 >>> 0 > $37 >>> 0) {
   if ($9 | 0) {
    $41 = 2 << $7;
    $44 = $9 << $7 & ($41 | 0 - $41);
    $47 = ($44 & 0 - $44) + -1 | 0;
    $49 = $47 >>> 12 & 16;
    $50 = $47 >>> $49;
    $52 = $50 >>> 5 & 8;
    $54 = $50 >>> $52;
    $56 = $54 >>> 2 & 4;
    $58 = $54 >>> $56;
    $60 = $58 >>> 1 & 2;
    $62 = $58 >>> $60;
    $64 = $62 >>> 1 & 1;
    $67 = ($52 | $49 | $56 | $60 | $64) + ($62 >>> $64) | 0;
    $69 = 1228 + ($67 << 1 << 2) | 0;
    $70 = $69 + 8 | 0;
    $71 = HEAP32[$70 >> 2] | 0;
    $72 = $71 + 8 | 0;
    $73 = HEAP32[$72 >> 2] | 0;
    do if (($69 | 0) == ($73 | 0)) {
     $77 = $8 & ~(1 << $67);
     HEAP32[297] = $77;
     $98 = $77;
    } else {
     if ($73 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
     $80 = $73 + 12 | 0;
     if ((HEAP32[$80 >> 2] | 0) == ($71 | 0)) {
      HEAP32[$80 >> 2] = $69;
      HEAP32[$70 >> 2] = $73;
      $98 = $8;
      break;
     } else _abort();
    } while (0);
    $84 = ($67 << 3) - $6 | 0;
    HEAP32[$71 + 4 >> 2] = $6 | 3;
    $87 = $71 + $6 | 0;
    HEAP32[$87 + 4 >> 2] = $84 | 1;
    HEAP32[$87 + $84 >> 2] = $84;
    if ($37 | 0) {
     $92 = HEAP32[302] | 0;
     $93 = $37 >>> 3;
     $95 = 1228 + ($93 << 1 << 2) | 0;
     $96 = 1 << $93;
     if (!($98 & $96)) {
      HEAP32[297] = $98 | $96;
      $$0199 = $95;
      $$pre$phiZ2D = $95 + 8 | 0;
     } else {
      $101 = $95 + 8 | 0;
      $102 = HEAP32[$101 >> 2] | 0;
      if ($102 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
       $$0199 = $102;
       $$pre$phiZ2D = $101;
      }
     }
     HEAP32[$$pre$phiZ2D >> 2] = $92;
     HEAP32[$$0199 + 12 >> 2] = $92;
     HEAP32[$92 + 8 >> 2] = $$0199;
     HEAP32[$92 + 12 >> 2] = $95;
    }
    HEAP32[299] = $84;
    HEAP32[302] = $87;
    $$0 = $72;
    STACKTOP = sp;
    return $$0 | 0;
   }
   $108 = HEAP32[298] | 0;
   if (!$108) $$0197 = $6; else {
    $112 = ($108 & 0 - $108) + -1 | 0;
    $114 = $112 >>> 12 & 16;
    $115 = $112 >>> $114;
    $117 = $115 >>> 5 & 8;
    $119 = $115 >>> $117;
    $121 = $119 >>> 2 & 4;
    $123 = $119 >>> $121;
    $125 = $123 >>> 1 & 2;
    $127 = $123 >>> $125;
    $129 = $127 >>> 1 & 1;
    $134 = HEAP32[1492 + (($117 | $114 | $121 | $125 | $129) + ($127 >>> $129) << 2) >> 2] | 0;
    $$0189$i = $134;
    $$0190$i = $134;
    $$0191$i = (HEAP32[$134 + 4 >> 2] & -8) - $6 | 0;
    while (1) {
     $140 = HEAP32[$$0189$i + 16 >> 2] | 0;
     if (!$140) {
      $143 = HEAP32[$$0189$i + 20 >> 2] | 0;
      if (!$143) break; else $146 = $143;
     } else $146 = $140;
     $149 = (HEAP32[$146 + 4 >> 2] & -8) - $6 | 0;
     $150 = $149 >>> 0 < $$0191$i >>> 0;
     $$0189$i = $146;
     $$0190$i = $150 ? $146 : $$0190$i;
     $$0191$i = $150 ? $149 : $$0191$i;
    }
    $151 = HEAP32[301] | 0;
    if ($$0190$i >>> 0 < $151 >>> 0) _abort();
    $153 = $$0190$i + $6 | 0;
    if ($$0190$i >>> 0 >= $153 >>> 0) _abort();
    $156 = HEAP32[$$0190$i + 24 >> 2] | 0;
    $158 = HEAP32[$$0190$i + 12 >> 2] | 0;
    do if (($158 | 0) == ($$0190$i | 0)) {
     $169 = $$0190$i + 20 | 0;
     $170 = HEAP32[$169 >> 2] | 0;
     if (!$170) {
      $172 = $$0190$i + 16 | 0;
      $173 = HEAP32[$172 >> 2] | 0;
      if (!$173) {
       $$3$i = 0;
       break;
      } else {
       $$1194$i = $173;
       $$1196$i = $172;
      }
     } else {
      $$1194$i = $170;
      $$1196$i = $169;
     }
     while (1) {
      $175 = $$1194$i + 20 | 0;
      $176 = HEAP32[$175 >> 2] | 0;
      if ($176 | 0) {
       $$1194$i = $176;
       $$1196$i = $175;
       continue;
      }
      $178 = $$1194$i + 16 | 0;
      $179 = HEAP32[$178 >> 2] | 0;
      if (!$179) break; else {
       $$1194$i = $179;
       $$1196$i = $178;
      }
     }
     if ($$1196$i >>> 0 < $151 >>> 0) _abort(); else {
      HEAP32[$$1196$i >> 2] = 0;
      $$3$i = $$1194$i;
      break;
     }
    } else {
     $161 = HEAP32[$$0190$i + 8 >> 2] | 0;
     if ($161 >>> 0 < $151 >>> 0) _abort();
     $163 = $161 + 12 | 0;
     if ((HEAP32[$163 >> 2] | 0) != ($$0190$i | 0)) _abort();
     $166 = $158 + 8 | 0;
     if ((HEAP32[$166 >> 2] | 0) == ($$0190$i | 0)) {
      HEAP32[$163 >> 2] = $158;
      HEAP32[$166 >> 2] = $161;
      $$3$i = $158;
      break;
     } else _abort();
    } while (0);
    do if ($156 | 0) {
     $184 = HEAP32[$$0190$i + 28 >> 2] | 0;
     $185 = 1492 + ($184 << 2) | 0;
     if (($$0190$i | 0) == (HEAP32[$185 >> 2] | 0)) {
      HEAP32[$185 >> 2] = $$3$i;
      if (!$$3$i) {
       HEAP32[298] = $108 & ~(1 << $184);
       break;
      }
     } else {
      if ($156 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
      $193 = $156 + 16 | 0;
      if ((HEAP32[$193 >> 2] | 0) == ($$0190$i | 0)) HEAP32[$193 >> 2] = $$3$i; else HEAP32[$156 + 20 >> 2] = $$3$i;
      if (!$$3$i) break;
     }
     $198 = HEAP32[301] | 0;
     if ($$3$i >>> 0 < $198 >>> 0) _abort();
     HEAP32[$$3$i + 24 >> 2] = $156;
     $202 = HEAP32[$$0190$i + 16 >> 2] | 0;
     do if ($202 | 0) if ($202 >>> 0 < $198 >>> 0) _abort(); else {
      HEAP32[$$3$i + 16 >> 2] = $202;
      HEAP32[$202 + 24 >> 2] = $$3$i;
      break;
     } while (0);
     $208 = HEAP32[$$0190$i + 20 >> 2] | 0;
     if ($208 | 0) if ($208 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
      HEAP32[$$3$i + 20 >> 2] = $208;
      HEAP32[$208 + 24 >> 2] = $$3$i;
      break;
     }
    } while (0);
    if ($$0191$i >>> 0 < 16) {
     $215 = $$0191$i + $6 | 0;
     HEAP32[$$0190$i + 4 >> 2] = $215 | 3;
     $219 = $$0190$i + $215 + 4 | 0;
     HEAP32[$219 >> 2] = HEAP32[$219 >> 2] | 1;
    } else {
     HEAP32[$$0190$i + 4 >> 2] = $6 | 3;
     HEAP32[$153 + 4 >> 2] = $$0191$i | 1;
     HEAP32[$153 + $$0191$i >> 2] = $$0191$i;
     if ($37 | 0) {
      $228 = HEAP32[302] | 0;
      $229 = $37 >>> 3;
      $231 = 1228 + ($229 << 1 << 2) | 0;
      $232 = 1 << $229;
      if (!($8 & $232)) {
       HEAP32[297] = $8 | $232;
       $$0187$i = $231;
       $$pre$phi$iZ2D = $231 + 8 | 0;
      } else {
       $236 = $231 + 8 | 0;
       $237 = HEAP32[$236 >> 2] | 0;
       if ($237 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
        $$0187$i = $237;
        $$pre$phi$iZ2D = $236;
       }
      }
      HEAP32[$$pre$phi$iZ2D >> 2] = $228;
      HEAP32[$$0187$i + 12 >> 2] = $228;
      HEAP32[$228 + 8 >> 2] = $$0187$i;
      HEAP32[$228 + 12 >> 2] = $231;
     }
     HEAP32[299] = $$0191$i;
     HEAP32[302] = $153;
    }
    $$0 = $$0190$i + 8 | 0;
    STACKTOP = sp;
    return $$0 | 0;
   }
  } else $$0197 = $6;
 } else if ($0 >>> 0 > 4294967231) $$0197 = -1; else {
  $245 = $0 + 11 | 0;
  $246 = $245 & -8;
  $247 = HEAP32[298] | 0;
  if (!$247) $$0197 = $246; else {
   $249 = 0 - $246 | 0;
   $250 = $245 >>> 8;
   if (!$250) $$0356$i = 0; else if ($246 >>> 0 > 16777215) $$0356$i = 31; else {
    $255 = ($250 + 1048320 | 0) >>> 16 & 8;
    $256 = $250 << $255;
    $259 = ($256 + 520192 | 0) >>> 16 & 4;
    $261 = $256 << $259;
    $264 = ($261 + 245760 | 0) >>> 16 & 2;
    $269 = 14 - ($259 | $255 | $264) + ($261 << $264 >>> 15) | 0;
    $$0356$i = $246 >>> ($269 + 7 | 0) & 1 | $269 << 1;
   }
   $276 = HEAP32[1492 + ($$0356$i << 2) >> 2] | 0;
   L123 : do if (!$276) {
    $$2353$i = 0;
    $$3$i201 = 0;
    $$3348$i = $249;
    label = 86;
   } else {
    $$0340$i = 0;
    $$0345$i = $249;
    $$0351$i = $276;
    $$0357$i = $246 << (($$0356$i | 0) == 31 ? 0 : 25 - ($$0356$i >>> 1) | 0);
    $$0360$i = 0;
    while (1) {
     $286 = (HEAP32[$$0351$i + 4 >> 2] & -8) - $246 | 0;
     if ($286 >>> 0 < $$0345$i >>> 0) if (!$286) {
      $$413$i = $$0351$i;
      $$434912$i = 0;
      $$435511$i = $$0351$i;
      label = 90;
      break L123;
     } else {
      $$1341$i = $$0351$i;
      $$1346$i = $286;
     } else {
      $$1341$i = $$0340$i;
      $$1346$i = $$0345$i;
     }
     $290 = HEAP32[$$0351$i + 20 >> 2] | 0;
     $$0351$i = HEAP32[$$0351$i + 16 + ($$0357$i >>> 31 << 2) >> 2] | 0;
     $$1361$i = ($290 | 0) == 0 | ($290 | 0) == ($$0351$i | 0) ? $$0360$i : $290;
     $296 = ($$0351$i | 0) == 0;
     if ($296) {
      $$2353$i = $$1361$i;
      $$3$i201 = $$1341$i;
      $$3348$i = $$1346$i;
      label = 86;
      break;
     } else {
      $$0340$i = $$1341$i;
      $$0345$i = $$1346$i;
      $$0357$i = $$0357$i << ($296 & 1 ^ 1);
      $$0360$i = $$1361$i;
     }
    }
   } while (0);
   if ((label | 0) == 86) {
    if (($$2353$i | 0) == 0 & ($$3$i201 | 0) == 0) {
     $301 = 2 << $$0356$i;
     $304 = $247 & ($301 | 0 - $301);
     if (!$304) {
      $$0197 = $246;
      break;
     }
     $308 = ($304 & 0 - $304) + -1 | 0;
     $310 = $308 >>> 12 & 16;
     $311 = $308 >>> $310;
     $313 = $311 >>> 5 & 8;
     $315 = $311 >>> $313;
     $317 = $315 >>> 2 & 4;
     $319 = $315 >>> $317;
     $321 = $319 >>> 1 & 2;
     $323 = $319 >>> $321;
     $325 = $323 >>> 1 & 1;
     $$4355$ph$i = HEAP32[1492 + (($313 | $310 | $317 | $321 | $325) + ($323 >>> $325) << 2) >> 2] | 0;
    } else $$4355$ph$i = $$2353$i;
    if (!$$4355$ph$i) {
     $$4$lcssa$i = $$3$i201;
     $$4349$lcssa$i = $$3348$i;
    } else {
     $$413$i = $$3$i201;
     $$434912$i = $$3348$i;
     $$435511$i = $$4355$ph$i;
     label = 90;
    }
   }
   if ((label | 0) == 90) while (1) {
    label = 0;
    $335 = (HEAP32[$$435511$i + 4 >> 2] & -8) - $246 | 0;
    $336 = $335 >>> 0 < $$434912$i >>> 0;
    $$$4349$i = $336 ? $335 : $$434912$i;
    $$4355$$4$i = $336 ? $$435511$i : $$413$i;
    $338 = HEAP32[$$435511$i + 16 >> 2] | 0;
    if ($338 | 0) {
     $$413$i = $$4355$$4$i;
     $$434912$i = $$$4349$i;
     $$435511$i = $338;
     label = 90;
     continue;
    }
    $$435511$i = HEAP32[$$435511$i + 20 >> 2] | 0;
    if (!$$435511$i) {
     $$4$lcssa$i = $$4355$$4$i;
     $$4349$lcssa$i = $$$4349$i;
     break;
    } else {
     $$413$i = $$4355$$4$i;
     $$434912$i = $$$4349$i;
     label = 90;
    }
   }
   if (!$$4$lcssa$i) $$0197 = $246; else if ($$4349$lcssa$i >>> 0 < ((HEAP32[299] | 0) - $246 | 0) >>> 0) {
    $347 = HEAP32[301] | 0;
    if ($$4$lcssa$i >>> 0 < $347 >>> 0) _abort();
    $349 = $$4$lcssa$i + $246 | 0;
    if ($$4$lcssa$i >>> 0 >= $349 >>> 0) _abort();
    $352 = HEAP32[$$4$lcssa$i + 24 >> 2] | 0;
    $354 = HEAP32[$$4$lcssa$i + 12 >> 2] | 0;
    do if (($354 | 0) == ($$4$lcssa$i | 0)) {
     $365 = $$4$lcssa$i + 20 | 0;
     $366 = HEAP32[$365 >> 2] | 0;
     if (!$366) {
      $368 = $$4$lcssa$i + 16 | 0;
      $369 = HEAP32[$368 >> 2] | 0;
      if (!$369) {
       $$3370$i = 0;
       break;
      } else {
       $$1368$i = $369;
       $$1372$i = $368;
      }
     } else {
      $$1368$i = $366;
      $$1372$i = $365;
     }
     while (1) {
      $371 = $$1368$i + 20 | 0;
      $372 = HEAP32[$371 >> 2] | 0;
      if ($372 | 0) {
       $$1368$i = $372;
       $$1372$i = $371;
       continue;
      }
      $374 = $$1368$i + 16 | 0;
      $375 = HEAP32[$374 >> 2] | 0;
      if (!$375) break; else {
       $$1368$i = $375;
       $$1372$i = $374;
      }
     }
     if ($$1372$i >>> 0 < $347 >>> 0) _abort(); else {
      HEAP32[$$1372$i >> 2] = 0;
      $$3370$i = $$1368$i;
      break;
     }
    } else {
     $357 = HEAP32[$$4$lcssa$i + 8 >> 2] | 0;
     if ($357 >>> 0 < $347 >>> 0) _abort();
     $359 = $357 + 12 | 0;
     if ((HEAP32[$359 >> 2] | 0) != ($$4$lcssa$i | 0)) _abort();
     $362 = $354 + 8 | 0;
     if ((HEAP32[$362 >> 2] | 0) == ($$4$lcssa$i | 0)) {
      HEAP32[$359 >> 2] = $354;
      HEAP32[$362 >> 2] = $357;
      $$3370$i = $354;
      break;
     } else _abort();
    } while (0);
    do if (!$352) $470 = $247; else {
     $380 = HEAP32[$$4$lcssa$i + 28 >> 2] | 0;
     $381 = 1492 + ($380 << 2) | 0;
     if (($$4$lcssa$i | 0) == (HEAP32[$381 >> 2] | 0)) {
      HEAP32[$381 >> 2] = $$3370$i;
      if (!$$3370$i) {
       $386 = $247 & ~(1 << $380);
       HEAP32[298] = $386;
       $470 = $386;
       break;
      }
     } else {
      if ($352 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
      $389 = $352 + 16 | 0;
      if ((HEAP32[$389 >> 2] | 0) == ($$4$lcssa$i | 0)) HEAP32[$389 >> 2] = $$3370$i; else HEAP32[$352 + 20 >> 2] = $$3370$i;
      if (!$$3370$i) {
       $470 = $247;
       break;
      }
     }
     $394 = HEAP32[301] | 0;
     if ($$3370$i >>> 0 < $394 >>> 0) _abort();
     HEAP32[$$3370$i + 24 >> 2] = $352;
     $398 = HEAP32[$$4$lcssa$i + 16 >> 2] | 0;
     do if ($398 | 0) if ($398 >>> 0 < $394 >>> 0) _abort(); else {
      HEAP32[$$3370$i + 16 >> 2] = $398;
      HEAP32[$398 + 24 >> 2] = $$3370$i;
      break;
     } while (0);
     $404 = HEAP32[$$4$lcssa$i + 20 >> 2] | 0;
     if (!$404) $470 = $247; else if ($404 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
      HEAP32[$$3370$i + 20 >> 2] = $404;
      HEAP32[$404 + 24 >> 2] = $$3370$i;
      $470 = $247;
      break;
     }
    } while (0);
    do if ($$4349$lcssa$i >>> 0 < 16) {
     $411 = $$4349$lcssa$i + $246 | 0;
     HEAP32[$$4$lcssa$i + 4 >> 2] = $411 | 3;
     $415 = $$4$lcssa$i + $411 + 4 | 0;
     HEAP32[$415 >> 2] = HEAP32[$415 >> 2] | 1;
    } else {
     HEAP32[$$4$lcssa$i + 4 >> 2] = $246 | 3;
     HEAP32[$349 + 4 >> 2] = $$4349$lcssa$i | 1;
     HEAP32[$349 + $$4349$lcssa$i >> 2] = $$4349$lcssa$i;
     $423 = $$4349$lcssa$i >>> 3;
     if ($$4349$lcssa$i >>> 0 < 256) {
      $426 = 1228 + ($423 << 1 << 2) | 0;
      $427 = HEAP32[297] | 0;
      $428 = 1 << $423;
      if (!($427 & $428)) {
       HEAP32[297] = $427 | $428;
       $$0366$i = $426;
       $$pre$phi$i206Z2D = $426 + 8 | 0;
      } else {
       $432 = $426 + 8 | 0;
       $433 = HEAP32[$432 >> 2] | 0;
       if ($433 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
        $$0366$i = $433;
        $$pre$phi$i206Z2D = $432;
       }
      }
      HEAP32[$$pre$phi$i206Z2D >> 2] = $349;
      HEAP32[$$0366$i + 12 >> 2] = $349;
      HEAP32[$349 + 8 >> 2] = $$0366$i;
      HEAP32[$349 + 12 >> 2] = $426;
      break;
     }
     $439 = $$4349$lcssa$i >>> 8;
     if (!$439) $$0359$i = 0; else if ($$4349$lcssa$i >>> 0 > 16777215) $$0359$i = 31; else {
      $444 = ($439 + 1048320 | 0) >>> 16 & 8;
      $445 = $439 << $444;
      $448 = ($445 + 520192 | 0) >>> 16 & 4;
      $450 = $445 << $448;
      $453 = ($450 + 245760 | 0) >>> 16 & 2;
      $458 = 14 - ($448 | $444 | $453) + ($450 << $453 >>> 15) | 0;
      $$0359$i = $$4349$lcssa$i >>> ($458 + 7 | 0) & 1 | $458 << 1;
     }
     $464 = 1492 + ($$0359$i << 2) | 0;
     HEAP32[$349 + 28 >> 2] = $$0359$i;
     $466 = $349 + 16 | 0;
     HEAP32[$466 + 4 >> 2] = 0;
     HEAP32[$466 >> 2] = 0;
     $468 = 1 << $$0359$i;
     if (!($470 & $468)) {
      HEAP32[298] = $470 | $468;
      HEAP32[$464 >> 2] = $349;
      HEAP32[$349 + 24 >> 2] = $464;
      HEAP32[$349 + 12 >> 2] = $349;
      HEAP32[$349 + 8 >> 2] = $349;
      break;
     }
     $$0342$i = $$4349$lcssa$i << (($$0359$i | 0) == 31 ? 0 : 25 - ($$0359$i >>> 1) | 0);
     $$0343$i = HEAP32[$464 >> 2] | 0;
     while (1) {
      if ((HEAP32[$$0343$i + 4 >> 2] & -8 | 0) == ($$4349$lcssa$i | 0)) {
       label = 148;
       break;
      }
      $487 = $$0343$i + 16 + ($$0342$i >>> 31 << 2) | 0;
      $489 = HEAP32[$487 >> 2] | 0;
      if (!$489) {
       label = 145;
       break;
      } else {
       $$0342$i = $$0342$i << 1;
       $$0343$i = $489;
      }
     }
     if ((label | 0) == 145) if ($487 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
      HEAP32[$487 >> 2] = $349;
      HEAP32[$349 + 24 >> 2] = $$0343$i;
      HEAP32[$349 + 12 >> 2] = $349;
      HEAP32[$349 + 8 >> 2] = $349;
      break;
     } else if ((label | 0) == 148) {
      $496 = $$0343$i + 8 | 0;
      $497 = HEAP32[$496 >> 2] | 0;
      $498 = HEAP32[301] | 0;
      if ($497 >>> 0 >= $498 >>> 0 & $$0343$i >>> 0 >= $498 >>> 0) {
       HEAP32[$497 + 12 >> 2] = $349;
       HEAP32[$496 >> 2] = $349;
       HEAP32[$349 + 8 >> 2] = $497;
       HEAP32[$349 + 12 >> 2] = $$0343$i;
       HEAP32[$349 + 24 >> 2] = 0;
       break;
      } else _abort();
     }
    } while (0);
    $$0 = $$4$lcssa$i + 8 | 0;
    STACKTOP = sp;
    return $$0 | 0;
   } else $$0197 = $246;
  }
 } while (0);
 $506 = HEAP32[299] | 0;
 if ($506 >>> 0 >= $$0197 >>> 0) {
  $508 = $506 - $$0197 | 0;
  $509 = HEAP32[302] | 0;
  if ($508 >>> 0 > 15) {
   $511 = $509 + $$0197 | 0;
   HEAP32[302] = $511;
   HEAP32[299] = $508;
   HEAP32[$511 + 4 >> 2] = $508 | 1;
   HEAP32[$511 + $508 >> 2] = $508;
   HEAP32[$509 + 4 >> 2] = $$0197 | 3;
  } else {
   HEAP32[299] = 0;
   HEAP32[302] = 0;
   HEAP32[$509 + 4 >> 2] = $506 | 3;
   $520 = $509 + $506 + 4 | 0;
   HEAP32[$520 >> 2] = HEAP32[$520 >> 2] | 1;
  }
  $$0 = $509 + 8 | 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $524 = HEAP32[300] | 0;
 if ($524 >>> 0 > $$0197 >>> 0) {
  $526 = $524 - $$0197 | 0;
  HEAP32[300] = $526;
  $527 = HEAP32[303] | 0;
  $528 = $527 + $$0197 | 0;
  HEAP32[303] = $528;
  HEAP32[$528 + 4 >> 2] = $526 | 1;
  HEAP32[$527 + 4 >> 2] = $$0197 | 3;
  $$0 = $527 + 8 | 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 if (!(HEAP32[415] | 0)) {
  HEAP32[417] = 4096;
  HEAP32[416] = 4096;
  HEAP32[418] = -1;
  HEAP32[419] = -1;
  HEAP32[420] = 0;
  HEAP32[408] = 0;
  $538 = $1 & -16 ^ 1431655768;
  HEAP32[$1 >> 2] = $538;
  HEAP32[415] = $538;
  $542 = 4096;
 } else $542 = HEAP32[417] | 0;
 $539 = $$0197 + 48 | 0;
 $540 = $$0197 + 47 | 0;
 $541 = $542 + $540 | 0;
 $543 = 0 - $542 | 0;
 $544 = $541 & $543;
 if ($544 >>> 0 <= $$0197 >>> 0) {
  $$0 = 0;
  STACKTOP = sp;
  return $$0 | 0;
 }
 $546 = HEAP32[407] | 0;
 if ($546 | 0) {
  $548 = HEAP32[405] | 0;
  $549 = $548 + $544 | 0;
  if ($549 >>> 0 <= $548 >>> 0 | $549 >>> 0 > $546 >>> 0) {
   $$0 = 0;
   STACKTOP = sp;
   return $$0 | 0;
  }
 }
 L255 : do if (!(HEAP32[408] & 4)) {
  $555 = HEAP32[303] | 0;
  L257 : do if (!$555) label = 172; else {
   $$0$i17$i = 1636;
   while (1) {
    $557 = HEAP32[$$0$i17$i >> 2] | 0;
    if ($557 >>> 0 <= $555 >>> 0) {
     $559 = $$0$i17$i + 4 | 0;
     if (($557 + (HEAP32[$559 >> 2] | 0) | 0) >>> 0 > $555 >>> 0) break;
    }
    $564 = HEAP32[$$0$i17$i + 8 >> 2] | 0;
    if (!$564) {
     label = 172;
     break L257;
    } else $$0$i17$i = $564;
   }
   $589 = $541 - $524 & $543;
   if ($589 >>> 0 < 2147483647) {
    $591 = _sbrk($589 | 0) | 0;
    if (($591 | 0) == ((HEAP32[$$0$i17$i >> 2] | 0) + (HEAP32[$559 >> 2] | 0) | 0)) {
     if (($591 | 0) != (-1 | 0)) {
      $$723947$i = $589;
      $$748$i = $591;
      label = 190;
      break L255;
     }
    } else {
     $$2247$ph$i = $591;
     $$2253$ph$i = $589;
     label = 180;
    }
   }
  } while (0);
  do if ((label | 0) == 172) {
   $566 = _sbrk(0) | 0;
   if (($566 | 0) != (-1 | 0)) {
    $568 = $566;
    $569 = HEAP32[416] | 0;
    $570 = $569 + -1 | 0;
    $$$i = (($570 & $568 | 0) == 0 ? 0 : ($570 + $568 & 0 - $569) - $568 | 0) + $544 | 0;
    $578 = HEAP32[405] | 0;
    $579 = $$$i + $578 | 0;
    if ($$$i >>> 0 > $$0197 >>> 0 & $$$i >>> 0 < 2147483647) {
     $582 = HEAP32[407] | 0;
     if ($582 | 0) if ($579 >>> 0 <= $578 >>> 0 | $579 >>> 0 > $582 >>> 0) break;
     $586 = _sbrk($$$i | 0) | 0;
     if (($586 | 0) == ($566 | 0)) {
      $$723947$i = $$$i;
      $$748$i = $566;
      label = 190;
      break L255;
     } else {
      $$2247$ph$i = $586;
      $$2253$ph$i = $$$i;
      label = 180;
     }
    }
   }
  } while (0);
  L274 : do if ((label | 0) == 180) {
   $597 = 0 - $$2253$ph$i | 0;
   do if ($539 >>> 0 > $$2253$ph$i >>> 0 & ($$2253$ph$i >>> 0 < 2147483647 & ($$2247$ph$i | 0) != (-1 | 0))) {
    $601 = HEAP32[417] | 0;
    $605 = $540 - $$2253$ph$i + $601 & 0 - $601;
    if ($605 >>> 0 < 2147483647) if ((_sbrk($605 | 0) | 0) == (-1 | 0)) {
     _sbrk($597 | 0) | 0;
     break L274;
    } else {
     $$5256$i = $605 + $$2253$ph$i | 0;
     break;
    } else $$5256$i = $$2253$ph$i;
   } else $$5256$i = $$2253$ph$i; while (0);
   if (($$2247$ph$i | 0) != (-1 | 0)) {
    $$723947$i = $$5256$i;
    $$748$i = $$2247$ph$i;
    label = 190;
    break L255;
   }
  } while (0);
  HEAP32[408] = HEAP32[408] | 4;
  label = 187;
 } else label = 187; while (0);
 if ((label | 0) == 187) if ($544 >>> 0 < 2147483647) {
  $614 = _sbrk($544 | 0) | 0;
  $615 = _sbrk(0) | 0;
  if ($614 >>> 0 < $615 >>> 0 & (($614 | 0) != (-1 | 0) & ($615 | 0) != (-1 | 0))) {
   $621 = $615 - $614 | 0;
   if ($621 >>> 0 > ($$0197 + 40 | 0) >>> 0) {
    $$723947$i = $621;
    $$748$i = $614;
    label = 190;
   }
  }
 }
 if ((label | 0) == 190) {
  $624 = (HEAP32[405] | 0) + $$723947$i | 0;
  HEAP32[405] = $624;
  if ($624 >>> 0 > (HEAP32[406] | 0) >>> 0) HEAP32[406] = $624;
  $627 = HEAP32[303] | 0;
  do if (!$627) {
   $629 = HEAP32[301] | 0;
   if (($629 | 0) == 0 | $$748$i >>> 0 < $629 >>> 0) HEAP32[301] = $$748$i;
   HEAP32[409] = $$748$i;
   HEAP32[410] = $$723947$i;
   HEAP32[412] = 0;
   HEAP32[306] = HEAP32[415];
   HEAP32[305] = -1;
   $$01$i$i = 0;
   do {
    $634 = 1228 + ($$01$i$i << 1 << 2) | 0;
    HEAP32[$634 + 12 >> 2] = $634;
    HEAP32[$634 + 8 >> 2] = $634;
    $$01$i$i = $$01$i$i + 1 | 0;
   } while (($$01$i$i | 0) != 32);
   $640 = $$748$i + 8 | 0;
   $645 = ($640 & 7 | 0) == 0 ? 0 : 0 - $640 & 7;
   $646 = $$748$i + $645 | 0;
   $647 = $$723947$i + -40 - $645 | 0;
   HEAP32[303] = $646;
   HEAP32[300] = $647;
   HEAP32[$646 + 4 >> 2] = $647 | 1;
   HEAP32[$646 + $647 + 4 >> 2] = 40;
   HEAP32[304] = HEAP32[419];
  } else {
   $$024370$i = 1636;
   while (1) {
    $653 = HEAP32[$$024370$i >> 2] | 0;
    $654 = $$024370$i + 4 | 0;
    $655 = HEAP32[$654 >> 2] | 0;
    if (($$748$i | 0) == ($653 + $655 | 0)) {
     label = 200;
     break;
    }
    $659 = HEAP32[$$024370$i + 8 >> 2] | 0;
    if (!$659) break; else $$024370$i = $659;
   }
   if ((label | 0) == 200) if (!(HEAP32[$$024370$i + 12 >> 2] & 8)) if ($627 >>> 0 < $$748$i >>> 0 & $627 >>> 0 >= $653 >>> 0) {
    HEAP32[$654 >> 2] = $655 + $$723947$i;
    $670 = $627 + 8 | 0;
    $675 = ($670 & 7 | 0) == 0 ? 0 : 0 - $670 & 7;
    $676 = $627 + $675 | 0;
    $678 = $$723947$i - $675 + (HEAP32[300] | 0) | 0;
    HEAP32[303] = $676;
    HEAP32[300] = $678;
    HEAP32[$676 + 4 >> 2] = $678 | 1;
    HEAP32[$676 + $678 + 4 >> 2] = 40;
    HEAP32[304] = HEAP32[419];
    break;
   }
   $684 = HEAP32[301] | 0;
   if ($$748$i >>> 0 < $684 >>> 0) {
    HEAP32[301] = $$748$i;
    $749 = $$748$i;
   } else $749 = $684;
   $686 = $$748$i + $$723947$i | 0;
   $$124469$i = 1636;
   while (1) {
    if ((HEAP32[$$124469$i >> 2] | 0) == ($686 | 0)) {
     label = 208;
     break;
    }
    $690 = HEAP32[$$124469$i + 8 >> 2] | 0;
    if (!$690) {
     $$0$i$i$i = 1636;
     break;
    } else $$124469$i = $690;
   }
   if ((label | 0) == 208) if (!(HEAP32[$$124469$i + 12 >> 2] & 8)) {
    HEAP32[$$124469$i >> 2] = $$748$i;
    $696 = $$124469$i + 4 | 0;
    HEAP32[$696 >> 2] = (HEAP32[$696 >> 2] | 0) + $$723947$i;
    $700 = $$748$i + 8 | 0;
    $706 = $$748$i + (($700 & 7 | 0) == 0 ? 0 : 0 - $700 & 7) | 0;
    $708 = $686 + 8 | 0;
    $714 = $686 + (($708 & 7 | 0) == 0 ? 0 : 0 - $708 & 7) | 0;
    $718 = $706 + $$0197 | 0;
    $719 = $714 - $706 - $$0197 | 0;
    HEAP32[$706 + 4 >> 2] = $$0197 | 3;
    do if (($714 | 0) == ($627 | 0)) {
     $724 = (HEAP32[300] | 0) + $719 | 0;
     HEAP32[300] = $724;
     HEAP32[303] = $718;
     HEAP32[$718 + 4 >> 2] = $724 | 1;
    } else {
     if (($714 | 0) == (HEAP32[302] | 0)) {
      $730 = (HEAP32[299] | 0) + $719 | 0;
      HEAP32[299] = $730;
      HEAP32[302] = $718;
      HEAP32[$718 + 4 >> 2] = $730 | 1;
      HEAP32[$718 + $730 >> 2] = $730;
      break;
     }
     $735 = HEAP32[$714 + 4 >> 2] | 0;
     if (($735 & 3 | 0) == 1) {
      $738 = $735 & -8;
      $739 = $735 >>> 3;
      L326 : do if ($735 >>> 0 < 256) {
       $742 = HEAP32[$714 + 8 >> 2] | 0;
       $744 = HEAP32[$714 + 12 >> 2] | 0;
       $746 = 1228 + ($739 << 1 << 2) | 0;
       do if (($742 | 0) != ($746 | 0)) {
        if ($742 >>> 0 < $749 >>> 0) _abort();
        if ((HEAP32[$742 + 12 >> 2] | 0) == ($714 | 0)) break;
        _abort();
       } while (0);
       if (($744 | 0) == ($742 | 0)) {
        HEAP32[297] = HEAP32[297] & ~(1 << $739);
        break;
       }
       do if (($744 | 0) == ($746 | 0)) $$pre$phi10$i$iZ2D = $744 + 8 | 0; else {
        if ($744 >>> 0 < $749 >>> 0) _abort();
        $760 = $744 + 8 | 0;
        if ((HEAP32[$760 >> 2] | 0) == ($714 | 0)) {
         $$pre$phi10$i$iZ2D = $760;
         break;
        }
        _abort();
       } while (0);
       HEAP32[$742 + 12 >> 2] = $744;
       HEAP32[$$pre$phi10$i$iZ2D >> 2] = $742;
      } else {
       $765 = HEAP32[$714 + 24 >> 2] | 0;
       $767 = HEAP32[$714 + 12 >> 2] | 0;
       do if (($767 | 0) == ($714 | 0)) {
        $778 = $714 + 16 | 0;
        $779 = $778 + 4 | 0;
        $780 = HEAP32[$779 >> 2] | 0;
        if (!$780) {
         $782 = HEAP32[$778 >> 2] | 0;
         if (!$782) {
          $$3$i$i = 0;
          break;
         } else {
          $$1290$i$i = $782;
          $$1292$i$i = $778;
         }
        } else {
         $$1290$i$i = $780;
         $$1292$i$i = $779;
        }
        while (1) {
         $784 = $$1290$i$i + 20 | 0;
         $785 = HEAP32[$784 >> 2] | 0;
         if ($785 | 0) {
          $$1290$i$i = $785;
          $$1292$i$i = $784;
          continue;
         }
         $787 = $$1290$i$i + 16 | 0;
         $788 = HEAP32[$787 >> 2] | 0;
         if (!$788) break; else {
          $$1290$i$i = $788;
          $$1292$i$i = $787;
         }
        }
        if ($$1292$i$i >>> 0 < $749 >>> 0) _abort(); else {
         HEAP32[$$1292$i$i >> 2] = 0;
         $$3$i$i = $$1290$i$i;
         break;
        }
       } else {
        $770 = HEAP32[$714 + 8 >> 2] | 0;
        if ($770 >>> 0 < $749 >>> 0) _abort();
        $772 = $770 + 12 | 0;
        if ((HEAP32[$772 >> 2] | 0) != ($714 | 0)) _abort();
        $775 = $767 + 8 | 0;
        if ((HEAP32[$775 >> 2] | 0) == ($714 | 0)) {
         HEAP32[$772 >> 2] = $767;
         HEAP32[$775 >> 2] = $770;
         $$3$i$i = $767;
         break;
        } else _abort();
       } while (0);
       if (!$765) break;
       $793 = HEAP32[$714 + 28 >> 2] | 0;
       $794 = 1492 + ($793 << 2) | 0;
       do if (($714 | 0) == (HEAP32[$794 >> 2] | 0)) {
        HEAP32[$794 >> 2] = $$3$i$i;
        if ($$3$i$i | 0) break;
        HEAP32[298] = HEAP32[298] & ~(1 << $793);
        break L326;
       } else {
        if ($765 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
        $803 = $765 + 16 | 0;
        if ((HEAP32[$803 >> 2] | 0) == ($714 | 0)) HEAP32[$803 >> 2] = $$3$i$i; else HEAP32[$765 + 20 >> 2] = $$3$i$i;
        if (!$$3$i$i) break L326;
       } while (0);
       $808 = HEAP32[301] | 0;
       if ($$3$i$i >>> 0 < $808 >>> 0) _abort();
       HEAP32[$$3$i$i + 24 >> 2] = $765;
       $811 = $714 + 16 | 0;
       $812 = HEAP32[$811 >> 2] | 0;
       do if ($812 | 0) if ($812 >>> 0 < $808 >>> 0) _abort(); else {
        HEAP32[$$3$i$i + 16 >> 2] = $812;
        HEAP32[$812 + 24 >> 2] = $$3$i$i;
        break;
       } while (0);
       $818 = HEAP32[$811 + 4 >> 2] | 0;
       if (!$818) break;
       if ($818 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
        HEAP32[$$3$i$i + 20 >> 2] = $818;
        HEAP32[$818 + 24 >> 2] = $$3$i$i;
        break;
       }
      } while (0);
      $$0$i18$i = $714 + $738 | 0;
      $$0286$i$i = $738 + $719 | 0;
     } else {
      $$0$i18$i = $714;
      $$0286$i$i = $719;
     }
     $826 = $$0$i18$i + 4 | 0;
     HEAP32[$826 >> 2] = HEAP32[$826 >> 2] & -2;
     HEAP32[$718 + 4 >> 2] = $$0286$i$i | 1;
     HEAP32[$718 + $$0286$i$i >> 2] = $$0286$i$i;
     $832 = $$0286$i$i >>> 3;
     if ($$0286$i$i >>> 0 < 256) {
      $835 = 1228 + ($832 << 1 << 2) | 0;
      $836 = HEAP32[297] | 0;
      $837 = 1 << $832;
      do if (!($836 & $837)) {
       HEAP32[297] = $836 | $837;
       $$0294$i$i = $835;
       $$pre$phi$i20$iZ2D = $835 + 8 | 0;
      } else {
       $841 = $835 + 8 | 0;
       $842 = HEAP32[$841 >> 2] | 0;
       if ($842 >>> 0 >= (HEAP32[301] | 0) >>> 0) {
        $$0294$i$i = $842;
        $$pre$phi$i20$iZ2D = $841;
        break;
       }
       _abort();
      } while (0);
      HEAP32[$$pre$phi$i20$iZ2D >> 2] = $718;
      HEAP32[$$0294$i$i + 12 >> 2] = $718;
      HEAP32[$718 + 8 >> 2] = $$0294$i$i;
      HEAP32[$718 + 12 >> 2] = $835;
      break;
     }
     $848 = $$0286$i$i >>> 8;
     do if (!$848) $$0295$i$i = 0; else {
      if ($$0286$i$i >>> 0 > 16777215) {
       $$0295$i$i = 31;
       break;
      }
      $853 = ($848 + 1048320 | 0) >>> 16 & 8;
      $854 = $848 << $853;
      $857 = ($854 + 520192 | 0) >>> 16 & 4;
      $859 = $854 << $857;
      $862 = ($859 + 245760 | 0) >>> 16 & 2;
      $867 = 14 - ($857 | $853 | $862) + ($859 << $862 >>> 15) | 0;
      $$0295$i$i = $$0286$i$i >>> ($867 + 7 | 0) & 1 | $867 << 1;
     } while (0);
     $873 = 1492 + ($$0295$i$i << 2) | 0;
     HEAP32[$718 + 28 >> 2] = $$0295$i$i;
     $875 = $718 + 16 | 0;
     HEAP32[$875 + 4 >> 2] = 0;
     HEAP32[$875 >> 2] = 0;
     $877 = HEAP32[298] | 0;
     $878 = 1 << $$0295$i$i;
     if (!($877 & $878)) {
      HEAP32[298] = $877 | $878;
      HEAP32[$873 >> 2] = $718;
      HEAP32[$718 + 24 >> 2] = $873;
      HEAP32[$718 + 12 >> 2] = $718;
      HEAP32[$718 + 8 >> 2] = $718;
      break;
     }
     $$0287$i$i = $$0286$i$i << (($$0295$i$i | 0) == 31 ? 0 : 25 - ($$0295$i$i >>> 1) | 0);
     $$0288$i$i = HEAP32[$873 >> 2] | 0;
     while (1) {
      if ((HEAP32[$$0288$i$i + 4 >> 2] & -8 | 0) == ($$0286$i$i | 0)) {
       label = 278;
       break;
      }
      $896 = $$0288$i$i + 16 + ($$0287$i$i >>> 31 << 2) | 0;
      $898 = HEAP32[$896 >> 2] | 0;
      if (!$898) {
       label = 275;
       break;
      } else {
       $$0287$i$i = $$0287$i$i << 1;
       $$0288$i$i = $898;
      }
     }
     if ((label | 0) == 275) if ($896 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
      HEAP32[$896 >> 2] = $718;
      HEAP32[$718 + 24 >> 2] = $$0288$i$i;
      HEAP32[$718 + 12 >> 2] = $718;
      HEAP32[$718 + 8 >> 2] = $718;
      break;
     } else if ((label | 0) == 278) {
      $905 = $$0288$i$i + 8 | 0;
      $906 = HEAP32[$905 >> 2] | 0;
      $907 = HEAP32[301] | 0;
      if ($906 >>> 0 >= $907 >>> 0 & $$0288$i$i >>> 0 >= $907 >>> 0) {
       HEAP32[$906 + 12 >> 2] = $718;
       HEAP32[$905 >> 2] = $718;
       HEAP32[$718 + 8 >> 2] = $906;
       HEAP32[$718 + 12 >> 2] = $$0288$i$i;
       HEAP32[$718 + 24 >> 2] = 0;
       break;
      } else _abort();
     }
    } while (0);
    $$0 = $706 + 8 | 0;
    STACKTOP = sp;
    return $$0 | 0;
   } else $$0$i$i$i = 1636;
   while (1) {
    $914 = HEAP32[$$0$i$i$i >> 2] | 0;
    if ($914 >>> 0 <= $627 >>> 0) {
     $918 = $914 + (HEAP32[$$0$i$i$i + 4 >> 2] | 0) | 0;
     if ($918 >>> 0 > $627 >>> 0) break;
    }
    $$0$i$i$i = HEAP32[$$0$i$i$i + 8 >> 2] | 0;
   }
   $922 = $918 + -47 | 0;
   $924 = $922 + 8 | 0;
   $930 = $922 + (($924 & 7 | 0) == 0 ? 0 : 0 - $924 & 7) | 0;
   $931 = $627 + 16 | 0;
   $933 = $930 >>> 0 < $931 >>> 0 ? $627 : $930;
   $934 = $933 + 8 | 0;
   $938 = $$748$i + 8 | 0;
   $943 = ($938 & 7 | 0) == 0 ? 0 : 0 - $938 & 7;
   $944 = $$748$i + $943 | 0;
   $945 = $$723947$i + -40 - $943 | 0;
   HEAP32[303] = $944;
   HEAP32[300] = $945;
   HEAP32[$944 + 4 >> 2] = $945 | 1;
   HEAP32[$944 + $945 + 4 >> 2] = 40;
   HEAP32[304] = HEAP32[419];
   $951 = $933 + 4 | 0;
   HEAP32[$951 >> 2] = 27;
   HEAP32[$934 >> 2] = HEAP32[409];
   HEAP32[$934 + 4 >> 2] = HEAP32[410];
   HEAP32[$934 + 8 >> 2] = HEAP32[411];
   HEAP32[$934 + 12 >> 2] = HEAP32[412];
   HEAP32[409] = $$748$i;
   HEAP32[410] = $$723947$i;
   HEAP32[412] = 0;
   HEAP32[411] = $934;
   $$0$i$i = $933 + 24 | 0;
   do {
    $$0$i$i = $$0$i$i + 4 | 0;
    HEAP32[$$0$i$i >> 2] = 7;
   } while (($$0$i$i + 4 | 0) >>> 0 < $918 >>> 0);
   if (($933 | 0) != ($627 | 0)) {
    $958 = $933 - $627 | 0;
    HEAP32[$951 >> 2] = HEAP32[$951 >> 2] & -2;
    HEAP32[$627 + 4 >> 2] = $958 | 1;
    HEAP32[$933 >> 2] = $958;
    $963 = $958 >>> 3;
    if ($958 >>> 0 < 256) {
     $966 = 1228 + ($963 << 1 << 2) | 0;
     $967 = HEAP32[297] | 0;
     $968 = 1 << $963;
     if (!($967 & $968)) {
      HEAP32[297] = $967 | $968;
      $$0211$i$i = $966;
      $$pre$phi$i$iZ2D = $966 + 8 | 0;
     } else {
      $972 = $966 + 8 | 0;
      $973 = HEAP32[$972 >> 2] | 0;
      if ($973 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
       $$0211$i$i = $973;
       $$pre$phi$i$iZ2D = $972;
      }
     }
     HEAP32[$$pre$phi$i$iZ2D >> 2] = $627;
     HEAP32[$$0211$i$i + 12 >> 2] = $627;
     HEAP32[$627 + 8 >> 2] = $$0211$i$i;
     HEAP32[$627 + 12 >> 2] = $966;
     break;
    }
    $979 = $958 >>> 8;
    if (!$979) $$0212$i$i = 0; else if ($958 >>> 0 > 16777215) $$0212$i$i = 31; else {
     $984 = ($979 + 1048320 | 0) >>> 16 & 8;
     $985 = $979 << $984;
     $988 = ($985 + 520192 | 0) >>> 16 & 4;
     $990 = $985 << $988;
     $993 = ($990 + 245760 | 0) >>> 16 & 2;
     $998 = 14 - ($988 | $984 | $993) + ($990 << $993 >>> 15) | 0;
     $$0212$i$i = $958 >>> ($998 + 7 | 0) & 1 | $998 << 1;
    }
    $1004 = 1492 + ($$0212$i$i << 2) | 0;
    HEAP32[$627 + 28 >> 2] = $$0212$i$i;
    HEAP32[$627 + 20 >> 2] = 0;
    HEAP32[$931 >> 2] = 0;
    $1007 = HEAP32[298] | 0;
    $1008 = 1 << $$0212$i$i;
    if (!($1007 & $1008)) {
     HEAP32[298] = $1007 | $1008;
     HEAP32[$1004 >> 2] = $627;
     HEAP32[$627 + 24 >> 2] = $1004;
     HEAP32[$627 + 12 >> 2] = $627;
     HEAP32[$627 + 8 >> 2] = $627;
     break;
    }
    $$0206$i$i = $958 << (($$0212$i$i | 0) == 31 ? 0 : 25 - ($$0212$i$i >>> 1) | 0);
    $$0207$i$i = HEAP32[$1004 >> 2] | 0;
    while (1) {
     if ((HEAP32[$$0207$i$i + 4 >> 2] & -8 | 0) == ($958 | 0)) {
      label = 304;
      break;
     }
     $1026 = $$0207$i$i + 16 + ($$0206$i$i >>> 31 << 2) | 0;
     $1028 = HEAP32[$1026 >> 2] | 0;
     if (!$1028) {
      label = 301;
      break;
     } else {
      $$0206$i$i = $$0206$i$i << 1;
      $$0207$i$i = $1028;
     }
    }
    if ((label | 0) == 301) if ($1026 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
     HEAP32[$1026 >> 2] = $627;
     HEAP32[$627 + 24 >> 2] = $$0207$i$i;
     HEAP32[$627 + 12 >> 2] = $627;
     HEAP32[$627 + 8 >> 2] = $627;
     break;
    } else if ((label | 0) == 304) {
     $1035 = $$0207$i$i + 8 | 0;
     $1036 = HEAP32[$1035 >> 2] | 0;
     $1037 = HEAP32[301] | 0;
     if ($1036 >>> 0 >= $1037 >>> 0 & $$0207$i$i >>> 0 >= $1037 >>> 0) {
      HEAP32[$1036 + 12 >> 2] = $627;
      HEAP32[$1035 >> 2] = $627;
      HEAP32[$627 + 8 >> 2] = $1036;
      HEAP32[$627 + 12 >> 2] = $$0207$i$i;
      HEAP32[$627 + 24 >> 2] = 0;
      break;
     } else _abort();
    }
   }
  } while (0);
  $1045 = HEAP32[300] | 0;
  if ($1045 >>> 0 > $$0197 >>> 0) {
   $1047 = $1045 - $$0197 | 0;
   HEAP32[300] = $1047;
   $1048 = HEAP32[303] | 0;
   $1049 = $1048 + $$0197 | 0;
   HEAP32[303] = $1049;
   HEAP32[$1049 + 4 >> 2] = $1047 | 1;
   HEAP32[$1048 + 4 >> 2] = $$0197 | 3;
   $$0 = $1048 + 8 | 0;
   STACKTOP = sp;
   return $$0 | 0;
  }
 }
 HEAP32[(___errno_location() | 0) >> 2] = 12;
 $$0 = 0;
 STACKTOP = sp;
 return $$0 | 0;
}

function _free($0) {
 $0 = $0 | 0;
 var $$0211$i = 0, $$0211$in$i = 0, $$0381 = 0, $$0382 = 0, $$0394 = 0, $$0401 = 0, $$1 = 0, $$1380 = 0, $$1385 = 0, $$1388 = 0, $$1396 = 0, $$1400 = 0, $$2 = 0, $$3 = 0, $$3398 = 0, $$pre$phi439Z2D = 0, $$pre$phi441Z2D = 0, $$pre$phiZ2D = 0, $10 = 0, $105 = 0, $106 = 0, $114 = 0, $115 = 0, $123 = 0, $13 = 0, $131 = 0, $136 = 0, $137 = 0, $140 = 0, $142 = 0, $144 = 0, $159 = 0, $16 = 0, $164 = 0, $166 = 0, $169 = 0, $17 = 0, $172 = 0, $175 = 0, $178 = 0, $179 = 0, $180 = 0, $182 = 0, $184 = 0, $185 = 0, $187 = 0, $188 = 0, $194 = 0, $195 = 0, $2 = 0, $204 = 0, $209 = 0, $21 = 0, $212 = 0, $213 = 0, $219 = 0, $234 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $243 = 0, $244 = 0, $250 = 0, $255 = 0, $256 = 0, $259 = 0, $26 = 0, $261 = 0, $264 = 0, $269 = 0, $275 = 0, $279 = 0, $28 = 0, $280 = 0, $298 = 0, $3 = 0, $300 = 0, $307 = 0, $308 = 0, $309 = 0, $317 = 0, $41 = 0, $46 = 0, $48 = 0, $51 = 0, $53 = 0, $56 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $63 = 0, $65 = 0, $66 = 0, $68 = 0, $69 = 0, $7 = 0, $74 = 0, $75 = 0, $84 = 0, $89 = 0, $9 = 0, $92 = 0, $93 = 0, $99 = 0, label = 0;
 if (!$0) return;
 $2 = $0 + -8 | 0;
 $3 = HEAP32[301] | 0;
 if ($2 >>> 0 < $3 >>> 0) _abort();
 $6 = HEAP32[$0 + -4 >> 2] | 0;
 $7 = $6 & 3;
 if (($7 | 0) == 1) _abort();
 $9 = $6 & -8;
 $10 = $2 + $9 | 0;
 do if (!($6 & 1)) {
  $13 = HEAP32[$2 >> 2] | 0;
  if (!$7) return;
  $16 = $2 + (0 - $13) | 0;
  $17 = $13 + $9 | 0;
  if ($16 >>> 0 < $3 >>> 0) _abort();
  if (($16 | 0) == (HEAP32[302] | 0)) {
   $105 = $10 + 4 | 0;
   $106 = HEAP32[$105 >> 2] | 0;
   if (($106 & 3 | 0) != 3) {
    $$1 = $16;
    $$1380 = $17;
    break;
   }
   HEAP32[299] = $17;
   HEAP32[$105 >> 2] = $106 & -2;
   HEAP32[$16 + 4 >> 2] = $17 | 1;
   HEAP32[$16 + $17 >> 2] = $17;
   return;
  }
  $21 = $13 >>> 3;
  if ($13 >>> 0 < 256) {
   $24 = HEAP32[$16 + 8 >> 2] | 0;
   $26 = HEAP32[$16 + 12 >> 2] | 0;
   $28 = 1228 + ($21 << 1 << 2) | 0;
   if (($24 | 0) != ($28 | 0)) {
    if ($24 >>> 0 < $3 >>> 0) _abort();
    if ((HEAP32[$24 + 12 >> 2] | 0) != ($16 | 0)) _abort();
   }
   if (($26 | 0) == ($24 | 0)) {
    HEAP32[297] = HEAP32[297] & ~(1 << $21);
    $$1 = $16;
    $$1380 = $17;
    break;
   }
   if (($26 | 0) == ($28 | 0)) $$pre$phi441Z2D = $26 + 8 | 0; else {
    if ($26 >>> 0 < $3 >>> 0) _abort();
    $41 = $26 + 8 | 0;
    if ((HEAP32[$41 >> 2] | 0) == ($16 | 0)) $$pre$phi441Z2D = $41; else _abort();
   }
   HEAP32[$24 + 12 >> 2] = $26;
   HEAP32[$$pre$phi441Z2D >> 2] = $24;
   $$1 = $16;
   $$1380 = $17;
   break;
  }
  $46 = HEAP32[$16 + 24 >> 2] | 0;
  $48 = HEAP32[$16 + 12 >> 2] | 0;
  do if (($48 | 0) == ($16 | 0)) {
   $59 = $16 + 16 | 0;
   $60 = $59 + 4 | 0;
   $61 = HEAP32[$60 >> 2] | 0;
   if (!$61) {
    $63 = HEAP32[$59 >> 2] | 0;
    if (!$63) {
     $$3 = 0;
     break;
    } else {
     $$1385 = $63;
     $$1388 = $59;
    }
   } else {
    $$1385 = $61;
    $$1388 = $60;
   }
   while (1) {
    $65 = $$1385 + 20 | 0;
    $66 = HEAP32[$65 >> 2] | 0;
    if ($66 | 0) {
     $$1385 = $66;
     $$1388 = $65;
     continue;
    }
    $68 = $$1385 + 16 | 0;
    $69 = HEAP32[$68 >> 2] | 0;
    if (!$69) break; else {
     $$1385 = $69;
     $$1388 = $68;
    }
   }
   if ($$1388 >>> 0 < $3 >>> 0) _abort(); else {
    HEAP32[$$1388 >> 2] = 0;
    $$3 = $$1385;
    break;
   }
  } else {
   $51 = HEAP32[$16 + 8 >> 2] | 0;
   if ($51 >>> 0 < $3 >>> 0) _abort();
   $53 = $51 + 12 | 0;
   if ((HEAP32[$53 >> 2] | 0) != ($16 | 0)) _abort();
   $56 = $48 + 8 | 0;
   if ((HEAP32[$56 >> 2] | 0) == ($16 | 0)) {
    HEAP32[$53 >> 2] = $48;
    HEAP32[$56 >> 2] = $51;
    $$3 = $48;
    break;
   } else _abort();
  } while (0);
  if (!$46) {
   $$1 = $16;
   $$1380 = $17;
  } else {
   $74 = HEAP32[$16 + 28 >> 2] | 0;
   $75 = 1492 + ($74 << 2) | 0;
   if (($16 | 0) == (HEAP32[$75 >> 2] | 0)) {
    HEAP32[$75 >> 2] = $$3;
    if (!$$3) {
     HEAP32[298] = HEAP32[298] & ~(1 << $74);
     $$1 = $16;
     $$1380 = $17;
     break;
    }
   } else {
    if ($46 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
    $84 = $46 + 16 | 0;
    if ((HEAP32[$84 >> 2] | 0) == ($16 | 0)) HEAP32[$84 >> 2] = $$3; else HEAP32[$46 + 20 >> 2] = $$3;
    if (!$$3) {
     $$1 = $16;
     $$1380 = $17;
     break;
    }
   }
   $89 = HEAP32[301] | 0;
   if ($$3 >>> 0 < $89 >>> 0) _abort();
   HEAP32[$$3 + 24 >> 2] = $46;
   $92 = $16 + 16 | 0;
   $93 = HEAP32[$92 >> 2] | 0;
   do if ($93 | 0) if ($93 >>> 0 < $89 >>> 0) _abort(); else {
    HEAP32[$$3 + 16 >> 2] = $93;
    HEAP32[$93 + 24 >> 2] = $$3;
    break;
   } while (0);
   $99 = HEAP32[$92 + 4 >> 2] | 0;
   if (!$99) {
    $$1 = $16;
    $$1380 = $17;
   } else if ($99 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
    HEAP32[$$3 + 20 >> 2] = $99;
    HEAP32[$99 + 24 >> 2] = $$3;
    $$1 = $16;
    $$1380 = $17;
    break;
   }
  }
 } else {
  $$1 = $2;
  $$1380 = $9;
 } while (0);
 if ($$1 >>> 0 >= $10 >>> 0) _abort();
 $114 = $10 + 4 | 0;
 $115 = HEAP32[$114 >> 2] | 0;
 if (!($115 & 1)) _abort();
 if (!($115 & 2)) {
  if (($10 | 0) == (HEAP32[303] | 0)) {
   $123 = (HEAP32[300] | 0) + $$1380 | 0;
   HEAP32[300] = $123;
   HEAP32[303] = $$1;
   HEAP32[$$1 + 4 >> 2] = $123 | 1;
   if (($$1 | 0) != (HEAP32[302] | 0)) return;
   HEAP32[302] = 0;
   HEAP32[299] = 0;
   return;
  }
  if (($10 | 0) == (HEAP32[302] | 0)) {
   $131 = (HEAP32[299] | 0) + $$1380 | 0;
   HEAP32[299] = $131;
   HEAP32[302] = $$1;
   HEAP32[$$1 + 4 >> 2] = $131 | 1;
   HEAP32[$$1 + $131 >> 2] = $131;
   return;
  }
  $136 = ($115 & -8) + $$1380 | 0;
  $137 = $115 >>> 3;
  do if ($115 >>> 0 < 256) {
   $140 = HEAP32[$10 + 8 >> 2] | 0;
   $142 = HEAP32[$10 + 12 >> 2] | 0;
   $144 = 1228 + ($137 << 1 << 2) | 0;
   if (($140 | 0) != ($144 | 0)) {
    if ($140 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
    if ((HEAP32[$140 + 12 >> 2] | 0) != ($10 | 0)) _abort();
   }
   if (($142 | 0) == ($140 | 0)) {
    HEAP32[297] = HEAP32[297] & ~(1 << $137);
    break;
   }
   if (($142 | 0) == ($144 | 0)) $$pre$phi439Z2D = $142 + 8 | 0; else {
    if ($142 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
    $159 = $142 + 8 | 0;
    if ((HEAP32[$159 >> 2] | 0) == ($10 | 0)) $$pre$phi439Z2D = $159; else _abort();
   }
   HEAP32[$140 + 12 >> 2] = $142;
   HEAP32[$$pre$phi439Z2D >> 2] = $140;
  } else {
   $164 = HEAP32[$10 + 24 >> 2] | 0;
   $166 = HEAP32[$10 + 12 >> 2] | 0;
   do if (($166 | 0) == ($10 | 0)) {
    $178 = $10 + 16 | 0;
    $179 = $178 + 4 | 0;
    $180 = HEAP32[$179 >> 2] | 0;
    if (!$180) {
     $182 = HEAP32[$178 >> 2] | 0;
     if (!$182) {
      $$3398 = 0;
      break;
     } else {
      $$1396 = $182;
      $$1400 = $178;
     }
    } else {
     $$1396 = $180;
     $$1400 = $179;
    }
    while (1) {
     $184 = $$1396 + 20 | 0;
     $185 = HEAP32[$184 >> 2] | 0;
     if ($185 | 0) {
      $$1396 = $185;
      $$1400 = $184;
      continue;
     }
     $187 = $$1396 + 16 | 0;
     $188 = HEAP32[$187 >> 2] | 0;
     if (!$188) break; else {
      $$1396 = $188;
      $$1400 = $187;
     }
    }
    if ($$1400 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
     HEAP32[$$1400 >> 2] = 0;
     $$3398 = $$1396;
     break;
    }
   } else {
    $169 = HEAP32[$10 + 8 >> 2] | 0;
    if ($169 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
    $172 = $169 + 12 | 0;
    if ((HEAP32[$172 >> 2] | 0) != ($10 | 0)) _abort();
    $175 = $166 + 8 | 0;
    if ((HEAP32[$175 >> 2] | 0) == ($10 | 0)) {
     HEAP32[$172 >> 2] = $166;
     HEAP32[$175 >> 2] = $169;
     $$3398 = $166;
     break;
    } else _abort();
   } while (0);
   if ($164 | 0) {
    $194 = HEAP32[$10 + 28 >> 2] | 0;
    $195 = 1492 + ($194 << 2) | 0;
    if (($10 | 0) == (HEAP32[$195 >> 2] | 0)) {
     HEAP32[$195 >> 2] = $$3398;
     if (!$$3398) {
      HEAP32[298] = HEAP32[298] & ~(1 << $194);
      break;
     }
    } else {
     if ($164 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort();
     $204 = $164 + 16 | 0;
     if ((HEAP32[$204 >> 2] | 0) == ($10 | 0)) HEAP32[$204 >> 2] = $$3398; else HEAP32[$164 + 20 >> 2] = $$3398;
     if (!$$3398) break;
    }
    $209 = HEAP32[301] | 0;
    if ($$3398 >>> 0 < $209 >>> 0) _abort();
    HEAP32[$$3398 + 24 >> 2] = $164;
    $212 = $10 + 16 | 0;
    $213 = HEAP32[$212 >> 2] | 0;
    do if ($213 | 0) if ($213 >>> 0 < $209 >>> 0) _abort(); else {
     HEAP32[$$3398 + 16 >> 2] = $213;
     HEAP32[$213 + 24 >> 2] = $$3398;
     break;
    } while (0);
    $219 = HEAP32[$212 + 4 >> 2] | 0;
    if ($219 | 0) if ($219 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
     HEAP32[$$3398 + 20 >> 2] = $219;
     HEAP32[$219 + 24 >> 2] = $$3398;
     break;
    }
   }
  } while (0);
  HEAP32[$$1 + 4 >> 2] = $136 | 1;
  HEAP32[$$1 + $136 >> 2] = $136;
  if (($$1 | 0) == (HEAP32[302] | 0)) {
   HEAP32[299] = $136;
   return;
  } else $$2 = $136;
 } else {
  HEAP32[$114 >> 2] = $115 & -2;
  HEAP32[$$1 + 4 >> 2] = $$1380 | 1;
  HEAP32[$$1 + $$1380 >> 2] = $$1380;
  $$2 = $$1380;
 }
 $234 = $$2 >>> 3;
 if ($$2 >>> 0 < 256) {
  $237 = 1228 + ($234 << 1 << 2) | 0;
  $238 = HEAP32[297] | 0;
  $239 = 1 << $234;
  if (!($238 & $239)) {
   HEAP32[297] = $238 | $239;
   $$0401 = $237;
   $$pre$phiZ2D = $237 + 8 | 0;
  } else {
   $243 = $237 + 8 | 0;
   $244 = HEAP32[$243 >> 2] | 0;
   if ($244 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
    $$0401 = $244;
    $$pre$phiZ2D = $243;
   }
  }
  HEAP32[$$pre$phiZ2D >> 2] = $$1;
  HEAP32[$$0401 + 12 >> 2] = $$1;
  HEAP32[$$1 + 8 >> 2] = $$0401;
  HEAP32[$$1 + 12 >> 2] = $237;
  return;
 }
 $250 = $$2 >>> 8;
 if (!$250) $$0394 = 0; else if ($$2 >>> 0 > 16777215) $$0394 = 31; else {
  $255 = ($250 + 1048320 | 0) >>> 16 & 8;
  $256 = $250 << $255;
  $259 = ($256 + 520192 | 0) >>> 16 & 4;
  $261 = $256 << $259;
  $264 = ($261 + 245760 | 0) >>> 16 & 2;
  $269 = 14 - ($259 | $255 | $264) + ($261 << $264 >>> 15) | 0;
  $$0394 = $$2 >>> ($269 + 7 | 0) & 1 | $269 << 1;
 }
 $275 = 1492 + ($$0394 << 2) | 0;
 HEAP32[$$1 + 28 >> 2] = $$0394;
 HEAP32[$$1 + 20 >> 2] = 0;
 HEAP32[$$1 + 16 >> 2] = 0;
 $279 = HEAP32[298] | 0;
 $280 = 1 << $$0394;
 do if (!($279 & $280)) {
  HEAP32[298] = $279 | $280;
  HEAP32[$275 >> 2] = $$1;
  HEAP32[$$1 + 24 >> 2] = $275;
  HEAP32[$$1 + 12 >> 2] = $$1;
  HEAP32[$$1 + 8 >> 2] = $$1;
 } else {
  $$0381 = $$2 << (($$0394 | 0) == 31 ? 0 : 25 - ($$0394 >>> 1) | 0);
  $$0382 = HEAP32[$275 >> 2] | 0;
  while (1) {
   if ((HEAP32[$$0382 + 4 >> 2] & -8 | 0) == ($$2 | 0)) {
    label = 130;
    break;
   }
   $298 = $$0382 + 16 + ($$0381 >>> 31 << 2) | 0;
   $300 = HEAP32[$298 >> 2] | 0;
   if (!$300) {
    label = 127;
    break;
   } else {
    $$0381 = $$0381 << 1;
    $$0382 = $300;
   }
  }
  if ((label | 0) == 127) if ($298 >>> 0 < (HEAP32[301] | 0) >>> 0) _abort(); else {
   HEAP32[$298 >> 2] = $$1;
   HEAP32[$$1 + 24 >> 2] = $$0382;
   HEAP32[$$1 + 12 >> 2] = $$1;
   HEAP32[$$1 + 8 >> 2] = $$1;
   break;
  } else if ((label | 0) == 130) {
   $307 = $$0382 + 8 | 0;
   $308 = HEAP32[$307 >> 2] | 0;
   $309 = HEAP32[301] | 0;
   if ($308 >>> 0 >= $309 >>> 0 & $$0382 >>> 0 >= $309 >>> 0) {
    HEAP32[$308 + 12 >> 2] = $$1;
    HEAP32[$307 >> 2] = $$1;
    HEAP32[$$1 + 8 >> 2] = $308;
    HEAP32[$$1 + 12 >> 2] = $$0382;
    HEAP32[$$1 + 24 >> 2] = 0;
    break;
   } else _abort();
  }
 } while (0);
 $317 = (HEAP32[305] | 0) + -1 | 0;
 HEAP32[305] = $317;
 if (!$317) $$0211$in$i = 1644; else return;
 while (1) {
  $$0211$i = HEAP32[$$0211$in$i >> 2] | 0;
  if (!$$0211$i) break; else $$0211$in$i = $$0211$i + 8 | 0;
 }
 HEAP32[305] = -1;
 return;
}

function _PBKDF2_OneIter($0, $1, $2, $3, $4, $5) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 $3 = $3 | 0;
 $4 = $4 | 0;
 $5 = $5 | 0;
 var $$01$i = 0, $$025$i$i = 0, $$026$i$i = 0, $$pr$i$i = 0, $16 = 0, $29 = 0, $43 = 0, $44 = 0, dest = 0, src = 0, stop = 0;
 if ($1 >>> 0 > 64) {
  HEAP32[191] = 0;
  HEAP32[183] = 1779033703;
  HEAP32[184] = -1150833019;
  HEAP32[185] = 1013904242;
  HEAP32[186] = -1521486534;
  HEAP32[187] = 1359893119;
  HEAP32[188] = -1694144372;
  HEAP32[189] = 528734635;
  HEAP32[190] = 1541459225;
  _SHA256_Update(732, $0, $1);
  _SHA256_Final(1816, 732);
  $$025$i$i = 1816;
  $$026$i$i = 32;
 } else {
  $$025$i$i = $0;
  $$026$i$i = $1;
 }
 HEAP32[191] = 0;
 HEAP32[183] = 1779033703;
 HEAP32[184] = -1150833019;
 HEAP32[185] = 1013904242;
 HEAP32[186] = -1521486534;
 HEAP32[187] = 1359893119;
 HEAP32[188] = -1694144372;
 HEAP32[189] = 528734635;
 HEAP32[190] = 1541459225;
 dest = 1752;
 stop = dest + 64 | 0;
 do {
  HEAP8[dest >> 0] = 54;
  dest = dest + 1 | 0;
 } while ((dest | 0) < (stop | 0));
 if (!$$026$i$i) $$pr$i$i = 1; else {
  HEAP8[1752] = HEAP8[$$025$i$i >> 0] ^ 54;
  if (($$026$i$i | 0) == 1) $$pr$i$i = 0; else {
   HEAP8[1753] = HEAP8[$$025$i$i + 1 >> 0] ^ 54;
   if (($$026$i$i | 0) == 2) $$pr$i$i = 0; else {
    HEAP8[1754] = HEAP8[$$025$i$i + 2 >> 0] ^ 54;
    if (($$026$i$i | 0) == 3) $$pr$i$i = 0; else {
     $16 = 3;
     do {
      HEAP8[1752 + $16 >> 0] = HEAP8[$$025$i$i + $16 >> 0] ^ HEAP8[1752 + $16 >> 0];
      $16 = $16 + 1 | 0;
     } while (($16 | 0) != ($$026$i$i | 0));
     $$pr$i$i = 0;
    }
   }
  }
 }
 _SHA256_Update(732, 1752, 64);
 HEAP32[216] = 0;
 HEAP32[208] = 1779033703;
 HEAP32[209] = -1150833019;
 HEAP32[210] = 1013904242;
 HEAP32[211] = -1521486534;
 HEAP32[212] = 1359893119;
 HEAP32[213] = -1694144372;
 HEAP32[214] = 528734635;
 HEAP32[215] = 1541459225;
 dest = 1752;
 stop = dest + 64 | 0;
 do {
  HEAP8[dest >> 0] = 92;
  dest = dest + 1 | 0;
 } while ((dest | 0) < (stop | 0));
 if (!$$pr$i$i) {
  HEAP8[1752] = HEAP8[$$025$i$i >> 0] ^ 92;
  if (($$026$i$i | 0) != 1) {
   HEAP8[1753] = HEAP8[$$025$i$i + 1 >> 0] ^ 92;
   if (($$026$i$i | 0) != 2) {
    HEAP8[1754] = HEAP8[$$025$i$i + 2 >> 0] ^ 92;
    if (($$026$i$i | 0) != 3) {
     $29 = 3;
     do {
      HEAP8[1752 + $29 >> 0] = HEAP8[$$025$i$i + $29 >> 0] ^ HEAP8[1752 + $29 >> 0];
      $29 = $29 + 1 | 0;
     } while (($29 | 0) != ($$026$i$i | 0));
    }
   }
  }
 }
 _SHA256_Update(832, 1752, 64);
 _SHA256_Update(732, $2, $3);
 if ($5 | 0) {
  $$01$i = 0;
  $44 = 0;
  do {
   $$01$i = $$01$i + 1 | 0;
   HEAP8[1687] = $$01$i;
   HEAP8[1686] = $$01$i >>> 8;
   HEAP8[1685] = $$01$i >>> 16;
   HEAP8[1684] = $$01$i >>> 24;
   _memcpy(932, 732, 200) | 0;
   _SHA256_Update(932, 1684, 4);
   _SHA256_Final(1848, 932);
   _SHA256_Update(1032, 1848, 32);
   _SHA256_Final(1688, 1032);
   dest = 1720;
   src = 1688;
   stop = dest + 32 | 0;
   do {
    HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
    dest = dest + 1 | 0;
    src = src + 1 | 0;
   } while ((dest | 0) < (stop | 0));
   $43 = $5 - $44 | 0;
   _memcpy($4 + $44 | 0, 1720, ($43 >>> 0 > 32 ? 32 : $43) | 0) | 0;
   $44 = $$01$i << 5;
  } while ($44 >>> 0 < $5 >>> 0);
 }
 return;
}

function ___stdio_write($0, $1, $2) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 var $$0 = 0, $$056 = 0, $$058 = 0, $$059 = 0, $$061 = 0, $$1 = 0, $$157 = 0, $$160 = 0, $13 = 0, $14 = 0, $19 = 0, $24 = 0, $29 = 0, $3 = 0, $38 = 0, $4 = 0, $40 = 0, $42 = 0, $5 = 0, $53 = 0, $7 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48 | 0;
 $vararg_buffer3 = sp + 16 | 0;
 $vararg_buffer = sp;
 $3 = sp + 32 | 0;
 $4 = $0 + 28 | 0;
 $5 = HEAP32[$4 >> 2] | 0;
 HEAP32[$3 >> 2] = $5;
 $7 = $0 + 20 | 0;
 $9 = (HEAP32[$7 >> 2] | 0) - $5 | 0;
 HEAP32[$3 + 4 >> 2] = $9;
 HEAP32[$3 + 8 >> 2] = $1;
 HEAP32[$3 + 12 >> 2] = $2;
 $13 = $0 + 60 | 0;
 $14 = $0 + 44 | 0;
 $$056 = 2;
 $$058 = $9 + $2 | 0;
 $$059 = $3;
 while (1) {
  if (!(HEAP32[285] | 0)) {
   HEAP32[$vararg_buffer3 >> 2] = HEAP32[$13 >> 2];
   HEAP32[$vararg_buffer3 + 4 >> 2] = $$059;
   HEAP32[$vararg_buffer3 + 8 >> 2] = $$056;
   $$0 = ___syscall_ret(___syscall146(146, $vararg_buffer3 | 0) | 0) | 0;
  } else {
   _pthread_cleanup_push(1, $0 | 0);
   HEAP32[$vararg_buffer >> 2] = HEAP32[$13 >> 2];
   HEAP32[$vararg_buffer + 4 >> 2] = $$059;
   HEAP32[$vararg_buffer + 8 >> 2] = $$056;
   $19 = ___syscall_ret(___syscall146(146, $vararg_buffer | 0) | 0) | 0;
   _pthread_cleanup_pop(0);
   $$0 = $19;
  }
  if (($$058 | 0) == ($$0 | 0)) {
   label = 6;
   break;
  }
  if (($$0 | 0) < 0) {
   label = 8;
   break;
  }
  $38 = $$058 - $$0 | 0;
  $40 = HEAP32[$$059 + 4 >> 2] | 0;
  if ($$0 >>> 0 > $40 >>> 0) {
   $42 = HEAP32[$14 >> 2] | 0;
   HEAP32[$4 >> 2] = $42;
   HEAP32[$7 >> 2] = $42;
   $$1 = $$0 - $40 | 0;
   $$157 = $$056 + -1 | 0;
   $$160 = $$059 + 8 | 0;
   $53 = HEAP32[$$059 + 12 >> 2] | 0;
  } else if (($$056 | 0) == 2) {
   HEAP32[$4 >> 2] = (HEAP32[$4 >> 2] | 0) + $$0;
   $$1 = $$0;
   $$157 = 2;
   $$160 = $$059;
   $53 = $40;
  } else {
   $$1 = $$0;
   $$157 = $$056;
   $$160 = $$059;
   $53 = $40;
  }
  HEAP32[$$160 >> 2] = (HEAP32[$$160 >> 2] | 0) + $$1;
  HEAP32[$$160 + 4 >> 2] = $53 - $$1;
  $$056 = $$157;
  $$058 = $38;
  $$059 = $$160;
 }
 if ((label | 0) == 6) {
  $24 = HEAP32[$14 >> 2] | 0;
  HEAP32[$0 + 16 >> 2] = $24 + (HEAP32[$0 + 48 >> 2] | 0);
  $29 = $24;
  HEAP32[$4 >> 2] = $29;
  HEAP32[$7 >> 2] = $29;
  $$061 = $2;
 } else if ((label | 0) == 8) {
  HEAP32[$0 + 16 >> 2] = 0;
  HEAP32[$4 >> 2] = 0;
  HEAP32[$7 >> 2] = 0;
  HEAP32[$0 >> 2] = HEAP32[$0 >> 2] | 32;
  if (($$056 | 0) == 2) $$061 = 0; else $$061 = $2 - (HEAP32[$$059 + 4 >> 2] | 0) | 0;
 }
 STACKTOP = sp;
 return $$061 | 0;
}

function _SHA256_Transform($0, $1) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $$01$i = 0, $$059 = 0, $$158 = 0, $$257 = 0, $112 = 0, $116 = 0, $123 = 0, $131 = 0, $25 = 0, $3 = 0, $51 = 0, $58 = 0, $63 = 0, $82 = 0, $93 = 0, $97 = 0, $51$looptemp = 0;
 $$01$i = 0;
 do {
  $3 = $1 + ($$01$i << 2) | 0;
  HEAP32[444 + ($$01$i << 2) >> 2] = (HEAPU8[$3 + 2 >> 0] | 0) << 8 | (HEAPU8[$3 + 3 >> 0] | 0) | (HEAPU8[$3 + 1 >> 0] | 0) << 16 | (HEAPU8[$3 >> 0] | 0) << 24;
  $$01$i = $$01$i + 1 | 0;
 } while (($$01$i | 0) != 16);
 $$059 = 16;
 $51 = HEAP32[111] | 0;
 do {
  $25 = HEAP32[444 + ($$059 + -2 << 2) >> 2] | 0;
  $51$looptemp = $51;
  $51 = HEAP32[444 + ($$059 + -15 << 2) >> 2] | 0;
  HEAP32[444 + ($$059 << 2) >> 2] = $51$looptemp + (HEAP32[444 + ($$059 + -7 << 2) >> 2] | 0) + (($25 >>> 19 | $25 << 13) ^ $25 >>> 10 ^ ($25 >>> 17 | $25 << 15)) + (($51 >>> 18 | $51 << 14) ^ $51 >>> 3 ^ ($51 >>> 7 | $51 << 25));
  $$059 = $$059 + 1 | 0;
 } while (($$059 | 0) != 64);
 HEAP32[175] = HEAP32[$0 >> 2];
 HEAP32[176] = HEAP32[$0 + 4 >> 2];
 HEAP32[177] = HEAP32[$0 + 8 >> 2];
 HEAP32[178] = HEAP32[$0 + 12 >> 2];
 HEAP32[179] = HEAP32[$0 + 16 >> 2];
 HEAP32[180] = HEAP32[$0 + 20 >> 2];
 HEAP32[181] = HEAP32[$0 + 24 >> 2];
 HEAP32[182] = HEAP32[$0 + 28 >> 2];
 $$158 = 0;
 do {
  $58 = 700 + (((71 - $$158 | 0) % 8 | 0) << 2) | 0;
  $63 = HEAP32[700 + (((68 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $82 = HEAP32[700 + (((70 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $93 = (HEAP32[444 + ($$158 << 2) >> 2] | 0) + (HEAP32[$58 >> 2] | 0) + (($63 >>> 6 | $63 << 26) ^ ($63 >>> 11 | $63 << 21) ^ ($63 >>> 25 | $63 << 7)) + (HEAP32[8 + ($$158 << 2) >> 2] | 0) + (($82 ^ HEAP32[700 + (((69 - $$158 | 0) % 8 | 0) << 2) >> 2]) & $63 ^ $82) | 0;
  $97 = HEAP32[700 + (((64 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $112 = HEAP32[700 + (((65 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $116 = HEAP32[700 + (((66 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $123 = 700 + (((67 - $$158 | 0) % 8 | 0) << 2) | 0;
  HEAP32[$123 >> 2] = (HEAP32[$123 >> 2] | 0) + $93;
  HEAP32[$58 >> 2] = (($97 >>> 2 | $97 << 30) ^ ($97 >>> 13 | $97 << 19) ^ ($97 >>> 22 | $97 << 10)) + $93 + (($116 | $112) & $97 | $116 & $112);
  $$158 = $$158 + 1 | 0;
 } while (($$158 | 0) != 64);
 $$257 = 0;
 do {
  $131 = $0 + ($$257 << 2) | 0;
  HEAP32[$131 >> 2] = (HEAP32[$131 >> 2] | 0) + (HEAP32[700 + ($$257 << 2) >> 2] | 0);
  $$257 = $$257 + 1 | 0;
 } while (($$257 | 0) != 8);
 return;
}

function _fflush($0) {
 $0 = $0 | 0;
 var $$0 = 0, $$02325 = 0, $$02327 = 0, $$024$lcssa = 0, $$02426 = 0, $$1 = 0, $25 = 0, $28 = 0, $7 = 0, $phitmp = 0;
 do if (!$0) {
  if (!(HEAP32[94] | 0)) $28 = 0; else $28 = _fflush(HEAP32[94] | 0) | 0;
  ___lock(1168);
  $$02325 = HEAP32[291] | 0;
  if (!$$02325) $$024$lcssa = $28; else {
   $$02327 = $$02325;
   $$02426 = $28;
   while (1) {
    if ((HEAP32[$$02327 + 76 >> 2] | 0) > -1) $25 = ___lockfile($$02327) | 0; else $25 = 0;
    if ((HEAP32[$$02327 + 20 >> 2] | 0) >>> 0 > (HEAP32[$$02327 + 28 >> 2] | 0) >>> 0) $$1 = ___fflush_unlocked($$02327) | 0 | $$02426; else $$1 = $$02426;
    if ($25 | 0) ___unlockfile($$02327);
    $$02327 = HEAP32[$$02327 + 56 >> 2] | 0;
    if (!$$02327) {
     $$024$lcssa = $$1;
     break;
    } else $$02426 = $$1;
   }
  }
  ___unlock(1168);
  $$0 = $$024$lcssa;
 } else {
  if ((HEAP32[$0 + 76 >> 2] | 0) <= -1) {
   $$0 = ___fflush_unlocked($0) | 0;
   break;
  }
  $phitmp = (___lockfile($0) | 0) == 0;
  $7 = ___fflush_unlocked($0) | 0;
  if ($phitmp) $$0 = $7; else {
   ___unlockfile($0);
   $$0 = $7;
  }
 } while (0);
 return $$0 | 0;
}

function _SHA256_Update($0, $1, $2) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 var $$0$lcssa = 0, $$027$lcssa = 0, $$02728 = 0, $$029 = 0, $10 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $18 = 0, $19 = 0, $21 = 0, $4 = 0, $5 = 0, $7 = 0;
 do if ($2 | 0) {
  $4 = $0 + 32 | 0;
  $5 = HEAP32[$4 >> 2] | 0;
  $7 = $5 >>> 3 & 63;
  HEAP32[$4 >> 2] = $5 + ($2 << 3);
  $10 = 64 - $7 | 0;
  $12 = $0 + 36 + $7 | 0;
  if ($10 >>> 0 > $2 >>> 0) {
   _memcpy($12 | 0, $1 | 0, $2 | 0) | 0;
   break;
  }
  _memcpy($12 | 0, $1 | 0, $10 | 0) | 0;
  $13 = $0 + 36 | 0;
  _SHA256_Transform($0, $13);
  $14 = $1 + $10 | 0;
  $15 = $2 - $10 | 0;
  if ($15 >>> 0 > 63) {
   $18 = $7 + $2 + -128 | 0;
   $19 = $18 & -64;
   $21 = $19 + 128 - $7 | 0;
   $$02728 = $15;
   $$029 = $14;
   while (1) {
    _SHA256_Transform($0, $$029);
    $$02728 = $$02728 + -64 | 0;
    if ($$02728 >>> 0 <= 63) break; else $$029 = $$029 + 64 | 0;
   }
   $$0$lcssa = $1 + $21 | 0;
   $$027$lcssa = $18 - $19 | 0;
  } else {
   $$0$lcssa = $14;
   $$027$lcssa = $15;
  }
  _memcpy($13 | 0, $$0$lcssa | 0, $$027$lcssa | 0) | 0;
 } while (0);
 return;
}

function ___fflush_unlocked($0) {
 $0 = $0 | 0;
 var $$0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $3 = 0, label = 0;
 $1 = $0 + 20 | 0;
 $3 = $0 + 28 | 0;
 if ((HEAP32[$1 >> 2] | 0) >>> 0 > (HEAP32[$3 >> 2] | 0) >>> 0) {
  FUNCTION_TABLE_iiii[HEAP32[$0 + 36 >> 2] & 3]($0, 0, 0) | 0;
  if (!(HEAP32[$1 >> 2] | 0)) $$0 = -1; else label = 3;
 } else label = 3;
 if ((label | 0) == 3) {
  $10 = $0 + 4 | 0;
  $11 = HEAP32[$10 >> 2] | 0;
  $12 = $0 + 8 | 0;
  $13 = HEAP32[$12 >> 2] | 0;
  if ($11 >>> 0 < $13 >>> 0) FUNCTION_TABLE_iiii[HEAP32[$0 + 40 >> 2] & 3]($0, $11 - $13 | 0, 1) | 0;
  HEAP32[$0 + 16 >> 2] = 0;
  HEAP32[$3 >> 2] = 0;
  HEAP32[$1 >> 2] = 0;
  HEAP32[$12 >> 2] = 0;
  HEAP32[$10 >> 2] = 0;
  $$0 = 0;
 }
 return $$0 | 0;
}

function _memcpy(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;
 if ((num | 0) >= 4096) return _emscripten_memcpy_big(dest | 0, src | 0, num | 0) | 0;
 ret = dest | 0;
 if ((dest & 3) == (src & 3)) {
  while (dest & 3) {
   if (!num) return ret | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
   dest = dest + 1 | 0;
   src = src + 1 | 0;
   num = num - 1 | 0;
  }
  while ((num | 0) >= 4) {
   HEAP32[dest >> 2] = HEAP32[src >> 2];
   dest = dest + 4 | 0;
   src = src + 4 | 0;
   num = num - 4 | 0;
  }
 }
 while ((num | 0) > 0) {
  HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  dest = dest + 1 | 0;
  src = src + 1 | 0;
  num = num - 1 | 0;
 }
 return ret | 0;
}

function _memset(ptr, value, num) {
 ptr = ptr | 0;
 value = value | 0;
 num = num | 0;
 var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
 stop = ptr + num | 0;
 if ((num | 0) >= 20) {
  value = value & 255;
  unaligned = ptr & 3;
  value4 = value | value << 8 | value << 16 | value << 24;
  stop4 = stop & ~3;
  if (unaligned) {
   unaligned = ptr + 4 - unaligned | 0;
   while ((ptr | 0) < (unaligned | 0)) {
    HEAP8[ptr >> 0] = value;
    ptr = ptr + 1 | 0;
   }
  }
  while ((ptr | 0) < (stop4 | 0)) {
   HEAP32[ptr >> 2] = value4;
   ptr = ptr + 4 | 0;
  }
 }
 while ((ptr | 0) < (stop | 0)) {
  HEAP8[ptr >> 0] = value;
  ptr = ptr + 1 | 0;
 }
 return ptr - num | 0;
}

function _SHA256_Final($0, $1) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $$01$i = 0, $12 = 0, $16 = 0, $18 = 0, $3 = 0;
 $3 = HEAP32[$1 + 32 >> 2] | 0;
 HEAP8[1139] = $3;
 HEAP8[1138] = $3 >>> 8;
 HEAP8[1137] = $3 >>> 16;
 HEAP8[1136] = $3 >>> 24;
 $12 = $3 >>> 3 & 63;
 HEAP32[283] = 0;
 _SHA256_Update($1, 380, ($12 >>> 0 < 56 ? 56 : 120) - $12 | 0);
 _SHA256_Update($1, 1132, 8);
 $$01$i = 0;
 do {
  $16 = $0 + ($$01$i << 2) | 0;
  $18 = HEAP32[$1 + ($$01$i << 2) >> 2] | 0;
  HEAP8[$16 + 3 >> 0] = $18;
  HEAP8[$16 + 2 >> 0] = $18 >>> 8;
  HEAP8[$16 + 1 >> 0] = $18 >>> 16;
  HEAP8[$16 >> 0] = $18 >>> 24;
  $$01$i = $$01$i + 1 | 0;
 } while (($$01$i | 0) != 8);
 return;
}

function runPostSets() {}
function _sbrk(increment) {
 increment = increment | 0;
 var oldDynamicTop = 0, newDynamicTop = 0;
 increment = increment + 15 & -16 | 0;
 oldDynamicTop = HEAP32[DYNAMICTOP_PTR >> 2] | 0;
 newDynamicTop = oldDynamicTop + increment | 0;
 if ((increment | 0) > 0 & (newDynamicTop | 0) < (oldDynamicTop | 0) | (newDynamicTop | 0) < 0) {
  abortOnCannotGrowMemory() | 0;
  ___setErrNo(12);
  return -1;
 }
 HEAP32[DYNAMICTOP_PTR >> 2] = newDynamicTop;
 if ((newDynamicTop | 0) > (getTotalMemory() | 0)) if (!(enlargeMemory() | 0)) {
  ___setErrNo(12);
  HEAP32[DYNAMICTOP_PTR >> 2] = oldDynamicTop;
  return -1;
 }
 return oldDynamicTop | 0;
}

function ___stdio_seek($0, $1, $2) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 var $3 = 0, $9 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32 | 0;
 $vararg_buffer = sp;
 $3 = sp + 20 | 0;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$0 + 60 >> 2];
 HEAP32[$vararg_buffer + 4 >> 2] = 0;
 HEAP32[$vararg_buffer + 8 >> 2] = $1;
 HEAP32[$vararg_buffer + 12 >> 2] = $3;
 HEAP32[$vararg_buffer + 16 >> 2] = $2;
 if ((___syscall_ret(___syscall140(140, $vararg_buffer | 0) | 0) | 0) < 0) {
  HEAP32[$3 >> 2] = -1;
  $9 = -1;
 } else $9 = HEAP32[$3 >> 2] | 0;
 STACKTOP = sp;
 return $9 | 0;
}

function ___stdout_write($0, $1, $2) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 var $13 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80 | 0;
 $vararg_buffer = sp;
 HEAP32[$0 + 36 >> 2] = 3;
 if (!(HEAP32[$0 >> 2] & 64)) {
  HEAP32[$vararg_buffer >> 2] = HEAP32[$0 + 60 >> 2];
  HEAP32[$vararg_buffer + 4 >> 2] = 21505;
  HEAP32[$vararg_buffer + 8 >> 2] = sp + 12;
  if (___syscall54(54, $vararg_buffer | 0) | 0) HEAP8[$0 + 75 >> 0] = -1;
 }
 $13 = ___stdio_write($0, $1, $2) | 0;
 STACKTOP = sp;
 return $13 | 0;
}

function ___stdio_close($0) {
 $0 = $0 | 0;
 var $4 = 0, $vararg_buffer = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16 | 0;
 $vararg_buffer = sp;
 HEAP32[$vararg_buffer >> 2] = HEAP32[$0 + 60 >> 2];
 $4 = ___syscall_ret(___syscall6(6, $vararg_buffer | 0) | 0) | 0;
 STACKTOP = sp;
 return $4 | 0;
}

function ___syscall_ret($0) {
 $0 = $0 | 0;
 var $$0 = 0;
 if ($0 >>> 0 > 4294963200) {
  HEAP32[(___errno_location() | 0) >> 2] = 0 - $0;
  $$0 = -1;
 } else $$0 = $0;
 return $$0 | 0;
}

function dynCall_iiii(index, a1, a2, a3) {
 index = index | 0;
 a1 = a1 | 0;
 a2 = a2 | 0;
 a3 = a3 | 0;
 return FUNCTION_TABLE_iiii[index & 3](a1 | 0, a2 | 0, a3 | 0) | 0;
}
function stackAlloc(size) {
 size = size | 0;
 var ret = 0;
 ret = STACKTOP;
 STACKTOP = STACKTOP + size | 0;
 STACKTOP = STACKTOP + 15 & -16;
 return ret | 0;
}

function ___errno_location() {
 var $$0 = 0;
 if (!(HEAP32[285] | 0)) $$0 = 1184; else $$0 = HEAP32[(_pthread_self() | 0) + 64 >> 2] | 0;
 return $$0 | 0;
}

function establishStackSpace(stackBase, stackMax) {
 stackBase = stackBase | 0;
 stackMax = stackMax | 0;
 STACKTOP = stackBase;
 STACK_MAX = stackMax;
}

function setThrew(threw, value) {
 threw = threw | 0;
 value = value | 0;
 if (!__THREW__) {
  __THREW__ = threw;
  threwValue = value;
 }
}

function dynCall_ii(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 return FUNCTION_TABLE_ii[index & 1](a1 | 0) | 0;
}

function dynCall_vi(index, a1) {
 index = index | 0;
 a1 = a1 | 0;
 FUNCTION_TABLE_vi[index & 1](a1 | 0);
}

function _cleanup_387($0) {
 $0 = $0 | 0;
 if (!(HEAP32[$0 + 68 >> 2] | 0)) ___unlockfile($0);
 return;
}

function b1(p0, p1, p2) {
 p0 = p0 | 0;
 p1 = p1 | 0;
 p2 = p2 | 0;
 abort(1);
 return 0;
}

function setTempRet0(value) {
 value = value | 0;
 tempRet0 = value;
}

function stackRestore(top) {
 top = top | 0;
 STACKTOP = top;
}

function b0(p0) {
 p0 = p0 | 0;
 abort(0);
 return 0;
}

function ___unlockfile($0) {
 $0 = $0 | 0;
 return;
}

function ___lockfile($0) {
 $0 = $0 | 0;
 return 0;
}

function getTempRet0() {
 return tempRet0 | 0;
}

function stackSave() {
 return STACKTOP | 0;
}

function b2(p0) {
 p0 = p0 | 0;
 abort(2);
}

function _pthread_self() {
 return 0;
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,___stdout_write,___stdio_seek,___stdio_write];
var FUNCTION_TABLE_vi = [b2,_cleanup_387];

  return { _sbrk: _sbrk, _fflush: _fflush, _pthread_self: _pthread_self, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _PBKDF2_OneIter: _PBKDF2_OneIter, _free: _free, ___errno_location: ___errno_location, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii, dynCall_vi: dynCall_vi };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var _malloc = Module["_malloc"] = asm["_malloc"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _pthread_self = Module["_pthread_self"] = asm["_pthread_self"];
var _memset = Module["_memset"] = asm["_memset"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _PBKDF2_OneIter = Module["_PBKDF2_OneIter"] = asm["_PBKDF2_OneIter"];
var _free = Module["_free"] = asm["_free"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===





function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }


  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  } else if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}







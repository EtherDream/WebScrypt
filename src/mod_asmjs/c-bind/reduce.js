const fs = require('fs')
const name = process.argv[2]
const infile = process.argv[3]
const outfile = process.argv[4]
const apis = JSON.parse(process.argv[5])
const initmem = !!process.argv[6]
const stackSize = +process.argv[7] || 8192

let code = fs.readFileSync(infile, 'utf8')

//
// memory initializer
//
let mem
let memBase64

if (initmem) {
	mem = code
		.split('/* memory initializer */ allocate([')[1]
		.split(']', 1)[0]
		.split(',')
		.map(v => +v)

	memBase64 = new Buffer(mem).toString('base64')
}

//
// remove unused func and var
//
let funMap = {}, funUsed = {}
let varMap = {}, varUsed = {}

// get all func
code
	.split('// EMSCRIPTEN_START_FUNCS')[1]
	.split('// EMSCRIPTEN_END_FUNCS')[0]

	// temp
	.replace(/(.*_emscripten_memcpy_big.*)/, '')

	.split(/\s*function\s+/)

	.forEach(body => {
		if (body) {
			let key = body.split('(', 1)[0]
			let val = 'function ' + body

			funMap[key] = val
		}
	})

// get all var
code
	.split("'use asm';")[1]
	.split('// EMSCRIPTEN_START_FUNCS')[0]

	.replace(/var/g, '')

	.split(/[;,]/)

	.forEach(assign => {
		let arr = assign.trim().split(/\s*=\s*/)
		let key = arr[0]
		let val = arr[1]
		if (key && val)
			varMap[key] = val
	})


function parseDep(fn) {
	if (fn in funUsed)
		return
	funUsed[fn] = true

	console.log('keep function:', fn)

	let fbody = funMap[fn]

	// enum symbols
	fbody.split(/[^\w\$]+/).forEach(v => {
		if (v in funMap)
			parseDep(v)
		else if (v in varMap)
			varUsed[v] = true
	})
}


apis.forEach(fn => {
	if (fn in funMap)
		parseDep(fn)
	else
		throw 'func `' + fn + '` not found!'
})


let varCode = Object.keys(varUsed)
	.map(key => key + ' = ' + varMap[key])
	.join(',\n')


let funCode = Object.keys(funUsed)
	.map(key => funMap[key])
	.join('\n')


let retCode = apis
	.map(v => v + ': ' + v)
	.join(',\n')


let basePtr = 8

if (initmem) {
	heapPtr = basePtr + mem.length + stackSize
} else
	heapPtr = basePtr + stackSize


let fncreate = initmem ?
`
	function create(buffer) {
		var arr = new Uint8Array(buffer);
		var bin = atob('${memBase64}');
		var base = ${basePtr};

		for (var i = 0; i < bin.length; i++) {
			arr[base + i] = bin.charCodeAt(i);
		}

		return asm(self, {}, buffer);
	}
`
:
`
	function create(buffer) {
		return asm(self, {}, buffer);
	}
`


let js = `
function ${name}() {
	'use strict';

	var asm = function(global, env, buffer) {
		'use asm';

		var
${varCode};

${funCode}

		return {
${retCode}
		};
	}

	${fncreate}

	function getHeap() {
		return ${heapPtr};
	}

	return {
		create: create,
		getHeap: getHeap
	};
};
`

fs.writeFileSync(outfile, js)

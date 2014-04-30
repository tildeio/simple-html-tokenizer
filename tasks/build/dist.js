var pickFiles = require('broccoli-static-compiler');
var moveFile = require('broccoli-file-mover');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var transpileES6 = require('broccoli-es6-module-transpiler');
var globalizeAMD = require('broccoli-globalize-amd');

var lib = 'lib';

// CommonJS

var transpiledCJS = transpileES6(lib, { type: 'cjs' });
var commonJS = pickFiles(transpiledCJS, {
  srcDir: '/',
  destDir: '/commonjs'
});

// Named and concatenated AMD

var transpiledAMD = transpileES6(lib, { moduleName: true });
var namedAMD = concatFiles(transpiledAMD, {
  inputFiles: ['**/*.js'],
  outputFile: '/simple-html-tokenizer.amd.js'
});

// Globals

var globals = globalizeAMD(moveFile(namedAMD, {
  srcFile: 'simple-html-tokenizer.amd.js',
  destFile: 'simple-html-tokenizer.js'
}), {
  namespace: 'HTML5Tokenizer',
  moduleName: 'simple-html-tokenizer'
});

module.exports = mergeTrees([commonJS, namedAMD, globals]);

var pickFiles = require('broccoli-static-compiler');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var transpileES6 = require('broccoli-es6-module-transpiler');
var globalizeAMD = require('broccoli-globalize-amd');

function getModuleName(filePath) {
  return filePath.replace(/.js$/, '');
}

exports.dist = function() {
  var lib = 'lib';
  var transpiledAMD = transpileES6(lib, {moduleName: getModuleName});
  var concatedAMD = concatFiles(transpiledAMD, {
    inputFiles: ['**/*.js'],
    outputFile: '/simple-html-tokenizer.amd.js'
  });
  // TODO: Copy simple-html-tokenizer.amd.js instead of concating twice.
  var globalizedAMD = globalizeAMD(concatFiles(transpiledAMD, {
    inputFiles: ['**/*.js'],
    outputFile: '/simple-html-tokenizer.js'
  }), {
    namespace: 'HTML5Tokenizer',
    moduleName: 'simple-html-tokenizer'
  });

  var transpiledCJS = transpileES6(lib, {type: 'cjs'});
  var distCJS = pickFiles(transpiledCJS, {
    srcDir: '/',
    destDir: '/commonjs'
  });

  return mergeTrees([distCJS, concatedAMD, globalizedAMD]);
};

exports.testInBrowser = function() {
  var lib = 'lib';
  var transpiledAMD = transpileES6(lib, {moduleName: getModuleName});
  var concatedLib = concatFiles(transpiledAMD, {
    inputFiles: ['**/*.js'],
    outputFile: '/simple-html-tokenizer.amd.js'
  });

  var tests = pickFiles('test', {
    srcDir: '/',
    files: ['**/*.js'],
    destDir: '/simple-html-tokenizer'
  });
  var transpiledTests = transpileES6(tests, {moduleName: getModuleName});
  var concatedTests = concatFiles(transpiledTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/simple-html-tokenizer-tests.amd.js'
  });

  var bower = 'bower_components';
  var loader = pickFiles(bower, {
    srcDir: 'loader.js',
    files: ['loader.js'],
    destDir: '/vendor'
  });
  var qunit = pickFiles(bower, {
    srcDir: 'qunit/qunit',
    files: ['qunit.js', 'qunit.css'],
    destDir: '/vendor'
  });
  var qunitIndex = pickFiles('test', {
    srcDir: '/',
    files: ['index.html'],
    destDir: '/'
  });

  return mergeTrees([concatedLib, concatedTests, loader, qunit, qunitIndex]);
};

exports.testInNode = function() {
  var lib = 'lib';
  var tests = pickFiles('test', {
    srcDir: '/tests',
    destDir: '/simple-html-tokenizer/tests'
  });
  var src = mergeTrees([lib, tests]);
  return transpileES6(src, {type: 'cjs'});
};

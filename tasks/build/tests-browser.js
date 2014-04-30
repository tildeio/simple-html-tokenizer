var pickFiles = require('broccoli-static-compiler');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var transpileES6 = require('broccoli-es6-module-transpiler');
var helpers = require('./helpers');

var src = helpers.pickLibAndTests();
var transpiled = transpileES6(src, { moduleName: true });
var concatted = concatFiles(transpiled, {
  inputFiles: ['**/*.js'],
  outputFile: '/simple-html-tokenizer-and-tests.amd.js'
});

// Testing assets

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

module.exports = mergeTrees([concatted, loader, qunit, qunitIndex]);

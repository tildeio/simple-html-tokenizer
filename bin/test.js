#!/usr/bin/env node
var QUnit = require('qunitjs');

var sys = require('sys');
var num = 1;
QUnit.begin(function (details) {
  sys.puts('1..'+details.totalTests);
});
QUnit.testDone(function (details) {
  sys.puts((details.failed ? 'not ok ' : 'ok ') + (num++) + ' - ' + details.module + ' - ' + details.name);
});

// we share the test file between browser/node
// export the global
global.HTML5Tokenizer = require('../dist/cjs/simple-html-tokenizer');
global.QUnit = require('qunitjs');
require('../test/tokenizer-tests.js');

// run tests
QUnit.load();

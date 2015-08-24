#!/usr/bin/env node
require('qunitjs');

if (process.argv[2] === 'testem') {
  // use basic TAP output for testem
  var sys = require('sys');
  var num = 1;
  QUnit.begin(function (details) {
    sys.puts('1..'+details.totalTests);
  });
  QUnit.testDone(function (details) {
    sys.puts((details.failed ? 'not ok ' : 'ok ') + (num++) + ' - ' + details.module + ' - ' + details.name);
  });
} else {
  // otherwise use a nicer test reporter
  var qe = require('qunit-extras');
  qe.runInContext(global);
}

// we share the test file between browser/node
// export the global
global.HTML5Tokenizer = require('../dist/simple-html-tokenizer');
require('../test/tokenizer-tests.js');

// run tests
QUnit.load();

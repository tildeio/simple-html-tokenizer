/* jshint node:true */
require('qunitjs');

// adds test reporting
var qe = require('qunit-extras');
qe.runInContext(global);

global.SimpleHTMLTokenizer = require('../dist/simple-html-tokenizer');
require('./support.js');
require('./generation-tests.js');
require('./tokenizer-tests.js');

QUnit.load();

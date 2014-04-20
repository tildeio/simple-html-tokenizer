var pickFiles = require('broccoli-static-compiler');
var mergeTrees = require('broccoli-merge-trees');

exports.pickLibAndTests = function() {
  var lib = 'lib';

  var tests = pickFiles('test', {
    srcDir: '/tests',
    destDir: '/simple-html-tokenizer/tests'
  });

  return mergeTrees([lib, tests]);
};

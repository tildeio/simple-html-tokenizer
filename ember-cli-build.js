var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var JSHint = require('broccoli-jshint');
var MergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-concat');

module.exports = function(/* defaults */) {
  var lib = new Funnel('lib/simple-html-tokenizer', {
    include: ['**/*.js'],
    destDir: '/lib/simple-html-tokenizer'
  });

  var bundled = new Rollup(lib, {
    rollup: {
      entry: 'lib/simple-html-tokenizer/index.js',

      sourceMap: true,
      dest: 'simple-html-tokenizer.js',
      format: 'umd',
      moduleName: 'HTML5Tokenizer'
    }
  });

  var tests = new Funnel('test', {
    files: ['tokenizer-tests.js'],
    destDir: '/test'
  });

  var libJSHint = new JSHint(lib);
  var testsJSHint = new JSHint(tests);

  var allTests = concat(new MergeTrees([tests, libJSHint, testsJSHint]), {
    outputFile: '/tests/tests.js',
    inputFiles: ['**/*.js'],
  });

  var testSupport = new Funnel('test', {
    files: ['index.html'],
    destDir: '/tests'
  });

  var qunit = new Funnel('node_modules/qunitjs', {
    srcDir: 'qunit',
    files: ['qunit.js', 'qunit.css'],
    destDir: '/tests'
  });

  return new MergeTrees([bundled, allTests, testSupport, qunit]);
};

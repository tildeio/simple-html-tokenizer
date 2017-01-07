var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var JSHint = require('broccoli-jshint');
var MergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-concat');

module.exports = function(/* defaults */) {
  var src = new Funnel('src', {
    include: ['**/*.js'],
    destDir: '/src'
  });

  var bundled = new Rollup(src, {
    rollup: {
      entry: 'src/index.js',

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

  var srcJSHint = new JSHint(src);
  var testsJSHint = new JSHint(tests);

  var allTests = concat(new MergeTrees([tests, srcJSHint, testsJSHint]), {
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

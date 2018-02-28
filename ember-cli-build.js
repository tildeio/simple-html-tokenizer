var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var JSHint = require('broccoli-jshint');
var typescript = require('broccoli-typescript-compiler').typescript;
var TSLint = require('broccoli-tslinter');
var MergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-concat');
var sourcemaps = require('rollup-plugin-sourcemaps');

module.exports = function(/* defaults */) {
  var srcTS = new Funnel('src', {
    destDir: '/src'
  });

  var src = typescript(srcTS, {
    workingPath: __dirname
  });

  var es6 = new Funnel(src, {
    destDir: '/es6'
  });

  var bundled = new Rollup(
    new MergeTrees([srcTS, es6]), {
    rollup: {
      input: 'es6/index.js',
      plugins: [
        sourcemaps(),
      ],
      output: [{
        file: 'simple-html-tokenizer.js',
        format: 'umd',
        sourcemap: true,
        moduleName: 'HTML5Tokenizer'
      }]
    }
  });

  var tests = new Funnel('tests', {
    files: ['tokenizer-tests.js'],
    destDir: '/tests'
  });

  var testsJSHint = new JSHint(tests);
  var srcTSLint = new TSLint(srcTS);

  var allTests = concat(new MergeTrees([tests, testsJSHint, srcTSLint]), {
    outputFile: '/tests/tests.js',
    inputFiles: ['**/*.js', '**/*.ts'],
  });

  var testSupport = new Funnel('tests', {
    files: ['index.html'],
    destDir: '/tests'
  });

  var qunit = new Funnel('node_modules/qunitjs', {
    srcDir: 'qunit',
    files: ['qunit.js', 'qunit.css'],
    destDir: '/tests'
  });

  return new MergeTrees([bundled, es6, allTests, testSupport, qunit]);
};

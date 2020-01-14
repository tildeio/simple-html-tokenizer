var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var typescript = require('broccoli-typescript-compiler').typescript;
var TSLint = require('broccoli-tslinter');
var MergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-concat');
var sourcemaps = require('rollup-plugin-sourcemaps');

module.exports = function(/* defaults */) {
  var src = new Funnel('src', {
    destDir: '/src'
  });

  var tests = new Funnel('tests', {
    destDir: '/tests'
  });

  var srcAndTests = new MergeTrees([src, tests]);

  var distSrcAndTests = typescript(srcAndTests, {
    workingPath: __dirname,
    rootPath: __dirname,
    buildPath: __dirname
  });

  var distSrc = new Funnel(distSrcAndTests, {
    srcDir: '/dist/src',
    destDir: '/dist/src'
  });

  var distBundle = new Rollup(new MergeTrees([src, distSrc]), {
    rollup: {
      input: 'dist/src/index.js',
      plugins: [sourcemaps()],
      output: [
        {
          file: 'dist/simple-html-tokenizer.js',
          format: 'umd',
          sourcemap: true,
          name: 'HTML5Tokenizer'
        },
        {
          file: 'dist/es6/index.js',
          format: 'es',
          sourcemap: true
        }
      ]
    }
  });

  var distTests = new Funnel(distSrcAndTests, {
    srcDir: '/dist/tests',
    destDir: '/dist/tests'
  });

  var distTestsUmd = new Rollup(new MergeTrees([tests, distTests]), {
    rollup: {
      input: 'dist/tests/tokenizer-tests.js',
      external: ['simple-html-tokenizer'],
      plugins: [sourcemaps()],
      output: [
        {
          globals: {
            'simple-html-tokenizer': 'HTML5Tokenizer'
          },
          file: 'dist/tests/tokenizer-tests.js',
          format: 'umd',
          sourcemap: true
        }
      ]
    }
  });

  var tslintTests = new TSLint(srcAndTests);

  var allTests = concat(new MergeTrees([tslintTests, distTestsUmd]), {
    inputFiles: ['**/*.js'],
    outputFile: '/dist/tests/tests.js'
  });

  var testSupport = new Funnel('tests', {
    files: ['index.html'],
    destDir: '/dist/tests'
  });

  var qunit = new Funnel('node_modules/qunit', {
    srcDir: 'qunit',
    files: ['qunit.js', 'qunit.css'],
    destDir: '/dist/tests'
  });

  var distTypes = new Funnel(distSrc, {
    include: ['**/*.d.ts'],
    srcDir: '/dist/src',
    destDir: '/dist/types'
  });

  var dist = new MergeTrees([
    distBundle,
    distTypes,
    allTests,
    testSupport,
    qunit
  ]);

  return new Funnel(dist, {
    srcDir: '/dist',
    destDir: '/'
  });
};

var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var JSHint = require('broccoli-jshint');
var TypeScript = require('broccoli-typescript-compiler').TypeScript;
var MergeTrees = require('broccoli-merge-trees');
var concat = require('broccoli-concat');

module.exports = function(/* defaults */) {
  var srcJS = new Funnel('src', {
    include: ['**/*.js'],
    destDir: '/src'
  });

  var srcTS = new Funnel('src', {
    include: ['**/*.ts'],
    destDir: '/src'
  });

  var transpiledSrcTs = new TypeScript(srcTS, {
    tsconfig: {
      compilerOptions: {
        module: 'es6',
        moduleResolution: 'node',
        target: 'es5',
        newLine: 'LF',
        declaration: true,
        strictNullChecks: true,
        inlineSourceMap: true,
        inlineSources: true
      },
      include: ['**/*']
    }
  });

  var src = new MergeTrees([srcJS, transpiledSrcTs]);

  var es6 = new Funnel(src, {
    srcDir: '/src',
    destDir: '/es6'
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

  var tests = new Funnel('tests', {
    files: ['tokenizer-tests.js'],
    destDir: '/tests'
  });

  var srcJSHint = new JSHint(src);
  var testsJSHint = new JSHint(tests);

  var allTests = concat(new MergeTrees([tests, srcJSHint, testsJSHint]), {
    outputFile: '/tests/tests.js',
    inputFiles: ['**/*.js'],
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

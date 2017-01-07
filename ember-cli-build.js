var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var MergeTrees = require('broccoli-merge-trees');

module.exports = function(/* defaults */) {
  var lib = new Funnel('lib/simple-html-tokenizer', {
    include: ['**/*.js'],
    destDir: '/'
  });

  var bundled = new Rollup(lib, {
    rollup: {
      entry: 'index.js',

      sourceMap: true,
      dest: 'simple-html-tokenizer.js',
      format: 'umd',
      moduleName: 'HTML5Tokenizer'
    }
  });

  var tests = new Funnel('test', {
    files: ['tokenizer-tests.js'],
    destDir: '/tests'
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

  return new MergeTrees([bundled, tests, testSupport, qunit]);
};

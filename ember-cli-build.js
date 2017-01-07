var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var MergeTrees = require('broccoli-merge-trees');

module.exports = function(/* defaults */) {
  var tokenizer = new Rollup('lib', {
    rollup: {
      entry: 'simple-html-tokenizer/index.js',

      sourceMap: true,
      dest: 'simple-html-tokenizer.js',
      format: 'umd',
      moduleName: 'HTML5Tokenizer'
    }
  });

  var tests = new Funnel('test', {
    files: ['index.html', 'tokenizer-tests.js'],
    destDir: '/tests'
  });

  var qunit = new Funnel('node_modules/qunitjs', {
    srcDir: 'qunit',
    files: ['qunit.js', 'qunit.css'],
    destDir: '/tests'
  });

  return new MergeTrees([tokenizer, tests, qunit]);
};

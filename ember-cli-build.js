var Rollup = require('broccoli-rollup');

module.exports = function(/* defaults */) {
  return new Rollup('lib', {
    rollup: {
      entry: 'simple-html-tokenizer/index.js',

      sourceMap: true,
      dest: 'simple-html-tokenizer.js',
      format: 'umd',
      moduleName: 'HTML5Tokenizer'
    }
  });
};

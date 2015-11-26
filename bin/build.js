#!/usr/bin/env node
var path = require('path');
var rollup = require('rollup');

var entry = path.resolve(__dirname, '../lib/simple-html-tokenizer/index.js');
var dest = path.resolve(__dirname, '../dist/simple-html-tokenizer.js');

rollup.rollup({
  entry: entry
}).then(function (bundle) {
  return bundle.write({
    sourceMap: true,
    dest: dest,
    format: 'umd',
    moduleName: 'HTML5Tokenizer'
  });
}).catch(function (err) {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});

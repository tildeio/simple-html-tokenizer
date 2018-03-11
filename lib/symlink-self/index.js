/* eslint-env node */
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'symlink-self',

  postBuild() {
    // allows require('simple-html-tokenizer'); from unit test
    try {
      fs.symlinkSync(
        path.resolve(__dirname, '../..'),
        path.resolve(__dirname, '../../node_modules/simple-html-tokenizer')
      );
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
  }
};

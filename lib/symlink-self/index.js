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
        this.project.root,
        path.join(this.project.root, 'node_modules', 'simple-html-tokenizer')
      );
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
  }
};

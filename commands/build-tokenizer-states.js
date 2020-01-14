'use strict';
const tokenizerStates = require('./codegen/tokenizer-states');
const codegen = require('./codegen');
const path = require('path');

module.exports = {
  name: 'build-tokenizer-states',
  works: 'insideProject',
  description: `Rebuild "tokenizer-states"`,

  availableOptions: [],

  run() {
    return codegen(
      this.ui,
      'w3c',
      'html',
      'master',
      'sections/syntax.include',
      path.join(this.project.root, 'src', 'generated', 'tokenizer-states.ts'),
      tokenizerStates
    );
  }
};

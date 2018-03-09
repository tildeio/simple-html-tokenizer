'use strict';
const tokenizerStates = require('./codegen/tokenizer-states');
const codegen = require('./codegen');

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
      'tokenizer-states.ts',
      tokenizerStates
    );
  }
};

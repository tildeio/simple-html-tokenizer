'use strict';
const entities = require('./codegen/entities');
const codegen = require('./codegen');
const path = require('path');

module.exports = {
  name: 'build-char-refs',
  works: 'insideProject',
  description: 'Rebuild "html5-named-char-refs"',

  availableOptions: [],

  run() {
    return codegen(
      this.ui,
      'w3c',
      'html',
      'master',
      'entities.json',
      path.join(this.project.root, 'src', 'generated', 'html5-named-char-refs.ts'),
      entities
    );
  }
};

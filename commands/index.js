'use strict';
/*jshint node:true*/
module.exports = {
  name: 'in-repo-commands',

  isDevelopingAddon: function() {
    return true;
  },

  includedCommands: function() {
    return {
      'build-char-refs': require('./build-char-refs-command.js'),
      'build-tokenizer-states': require('./build-tokenizer-states.js')
    };
  }
};

'use strict';
const STATE_REGEX = /tokenizer-([\w-]+?)-state/g;
const KEBOB_REGEX = /-([a-z])/g;

module.exports = function buildTokenizerStates(syntax) {
  const states = ['beforeData'];
  let m;
  while ((m = STATE_REGEX.exec(syntax))) {
    let state = m[1].replace(KEBOB_REGEX, function(g) {
      return g[1].toUpperCase();
    });
    states.push(state);
  }
  return `export const enum TokenizerState {
${states.map(s => `  ${s} = '${s}'`).join(',\n')}
}
`;
};

const https = require('https');
const fs = require('fs');

const OUTFILE = require('path').resolve(__dirname, '../src/tokenizer-states.ts');
const SYNTAX_URL = 'https://raw.githubusercontent.com/w3c/html/master/sections/syntax.include';
const STATE_REGEX = /tokenizer-([\w-]+?)-state/g;
const KEBOB_REGEX = /-([a-z])/g;

module.exports = {
  name: 'build-tokenizer-states',
  works: 'insideProject',
  description: `Rebuild "tokenizer-states" from ${SYNTAX_URL}`,

  availableOptions: [],

  run: function() {
    return new Promise(function(resolve) {
      console.log(`downloading ${SYNTAX_URL}`);
      https.get(SYNTAX_URL, function(res) {
        console.log(res.statusCode);
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', function() {
          console.log(OUTFILE);
          fs.writeFileSync(OUTFILE, buildTokenizerStates(body));
          resolve();
        });
      });
    });
  }
};

/**
 * Generate const enum
 * @param {string} syntax
 * @returns {string}
 */
function buildTokenizerStates(syntax) {
  let states = ['beforeData'];
  let m;
  while (m = STATE_REGEX.exec(syntax)) {
    let state = m[1].replace(KEBOB_REGEX, function (g) { return g[1].toUpperCase(); });
    states.push(state);
  }
  return `// generated do not edit
export const enum TokenizerState {
${states.map(s => `  ${s} = '${s}'`).join(',\n')}
}
`;
}

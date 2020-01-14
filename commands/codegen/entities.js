'use strict';
// lifted from jshint
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/;

module.exports = function buildEntitiesModule(body) {
  let data = JSON.parse(body);
  let dest = `export default {\n`;
  let seen = Object.create(null);
  let entities = Object.keys(data);
  let len = entities.length;
  let entity, name, characters, literal;
  for (let i = 0; i < len; i++) {
    entity = entities[i];
    if (entity[entity.length - 1] === ';') {
      name = entity.slice(1, -1);
    } else {
      name = entity.slice(1);
    }
    if (seen[name]) {
      continue;
    }
    seen[name] = true;
    if (i > 0) {
      dest += ',';
    }
    characters = data[entity].characters;
    if (UNSAFE.test(characters)) {
      literal = codepointsLiteral(data[entity].codepoints);
    } else {
      literal = JSON.stringify(characters);
    }
    dest += name + ':' + literal;
  }
  dest += '\n};\n';
  return dest;
};

function codepointLiteral(codepoint) {
  let n = codepoint.toString(16);
  if (n.length < 4) {
    n = new Array(4 - n.length + 1).join('0') + n;
  }
  return '\\u' + n;
}

function codepointsLiteral(codepoints) {
  return '"' + codepoints.map(codepointLiteral).join('') + '"';
}

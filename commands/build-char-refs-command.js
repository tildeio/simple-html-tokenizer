var http = require('http');
var fs = require('fs');

var outFile = require('path').resolve(__dirname, '../src/html5-named-char-refs.ts');

// lifted from jshint
var UNSAFE = /[\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/;

module.exports = {
  name: 'build-char-refs',
  works: 'insideProject',
  description: 'Rebuild "html5-named-char-refs" from "http://www.w3.org/TR/html5/entities.json"',

  availableOptions: [],

  run: function() {
    return new Promise(function(resolve) {
      console.log('downloading html5 entities.json');
      http.get("http://www.w3.org/TR/html5/entities.json", function(res) {
        console.log(res.statusCode);
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (chunk) {
          body += chunk;
        });
        res.on('end', function() {
          var data = JSON.parse(body);
          console.log(outFile);
          fs.writeFileSync(outFile, buildEntitiesModule(data));
          resolve();
        });
      });
    });
  }
};

function codepointLiteral(codepoint) {
  var n = codepoint.toString(16);
  if (n.length < 4) {
    n = new Array(4 - n.length + 1).join('0') + n;
  }
  return '\\u' + n;
}

function codepointsLiteral(codepoints) {
  return '"' + codepoints.map(codepointLiteral).join('') + '"';
}

function buildEntitiesModule(data) {
  var dest = `// generated do not edit\nexport default {\n`;
  var seen = Object.create(null);
  var entities = Object.keys(data);
  var len = entities.length;
  var entity, name, characters, literal;
  for (var i = 0; i < len; i++) {
    entity = entities[i];
    if (entity[entity.length-1] === ';') {
      name = entity.slice(1,-1);
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
}

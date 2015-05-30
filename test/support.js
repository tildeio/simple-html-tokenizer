/* global HTML5Tokenizer: false */
(function () {

QUnit.assert.generates = function(source, expected) {
  var actual = HTML5Tokenizer.generate(HTML5Tokenizer.tokenize(source));
  this.push(actual === expected, actual, expected);
};

QUnit.assert.tokensEqual = function(actual, _expected, message){
  var expected;
  if (typeof _expected === 'function') {
    expected = _expected(locInfo);
  } else {
    removeLocInfo(actual);
    expected = _expected;
  }
  deepEqual(actual, makeArray(expected), message);
};

function locInfo(token, startLine, startColumn, endLine, endColumn) {
  token.loc = {
    start: {
      line: startLine,
      column: startColumn
    },
    end: {
      line: endLine,
      column: endColumn
    }
  };

  return token;
}

function removeLocInfo(tokens) {
  for (var i = 0; i < tokens.length; i++) {
    delete tokens[i].loc;
  }
}

function makeArray(object) {
  if (object instanceof Array) {
    return object;
  } else {
    return [object];
  }
}

}());

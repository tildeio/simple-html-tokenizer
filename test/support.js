/* global SimpleHTMLTokenizer: false */
(function () {

QUnit.assert.generates = function(source, expected) {
  var actual = SimpleHTMLTokenizer.generate(SimpleHTMLTokenizer.tokenize(source));
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

function locInfo(token, firstLine, firstColumn, lastLine, lastColumn) {
  token.firstLine = firstLine;
  token.firstColumn = firstColumn;
  token.lastLine = lastLine;
  token.lastColumn = lastColumn;
  return token;
}

function removeLocInfo(tokens) {
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    delete token.firstLine;
    delete token.firstColumn;
    delete token.lastLine;
    delete token.lastColumn;
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

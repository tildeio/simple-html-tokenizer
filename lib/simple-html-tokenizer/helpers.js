export function makeArray(object) {
  if (object instanceof Array) {
    return object;
  } else {
    return [object];
  }
}

export var objectCreate = Object.create || function objectCreate(obj) {
  function F() {}
  F.prototype = obj;
  return new F();
};

export function isSpace(char) {
  return (/[\t\n\f ]/).test(char);
}

export function isAlpha(char) {
  return (/[A-Za-z]/).test(char);
}

export function isUpper(char) {
  return (/[A-Z]/).test(char);
}

export function removeLocInfo(tokens) {
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    delete token.firstLine;
    delete token.firstColumn;
    delete token.lastLine;
    delete token.lastColumn;
  }
}

export function tokensEqual(actual, expected, checkLocInfo, message) {
  if (!checkLocInfo) {
    removeLocInfo(actual);
  }
  deepEqual(actual, makeArray(expected), message);
}

export function locInfo(token, firstLine, firstColumn, lastLine, lastColumn) {
  token.firstLine = firstLine;
  token.firstColumn = firstColumn;
  token.lastLine = lastLine;
  token.lastColumn = lastColumn;
  return token;
}

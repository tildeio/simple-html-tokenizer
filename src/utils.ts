const WSP = /[\t\n\f ]/;
const ALPHA = /[A-Za-z]/;
const CRLF = /\r\n?/g;

export function isSpace(char) {
  return WSP.test(char);
}

export function isAlpha(char) {
  return ALPHA.test(char);
}

export function preprocessInput(input) {
  return input.replace(CRLF, "\n");
}

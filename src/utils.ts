const WSP = /[\t\n\f ]/;
const ALPHA = /[A-Za-z]/;
const CRLF = /\r\n?/g;

export function isSpace(char): boolean {
  return WSP.test(char);
}

export function isAlpha(char): boolean {
  return ALPHA.test(char);
}

export function preprocessInput(input): string {
  return input.replace(CRLF, "\n");
}

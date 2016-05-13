var WSP = /[\t\n\f ]/;
var ALPHA = /[A-Za-z]/;
var CRLF = /\r\n?/g;

export function isSpace(char: string): boolean {
  return WSP.test(char);
}

export function isAlpha(char: string): boolean {
  return ALPHA.test(char);
}

export function preprocessInput(input: string): string {
  return input.replace(CRLF, "\n");
}

export type opaque = {} | void;
export type Option<T> = T | null;
export type Maybe<T> = Option<T> | null;

export function unwrap<T>(maybe: Maybe<T>): T {
  if (!maybe) throw new Error(`Unwrapping ${maybe}, but it was null`);
  return maybe;
}
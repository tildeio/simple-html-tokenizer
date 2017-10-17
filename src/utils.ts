const WSP = /[\t\n\f ]/;
const ALPHA = /[A-Za-z]/;
const CRLF = /\r\n?/g;

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
export type Maybe<T> = Option<T> | undefined | void;

export function unwrap<T>(maybe: Maybe<T>, msg?: string): T {
  if (!maybe) throw new Error(`${msg || 'value'} was null`);
  return maybe;
}

export function or<T, U>(maybe: Maybe<T>, otherwise: U): T | U {
  return maybe || otherwise;
}
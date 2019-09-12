export interface NamedEntityMap {
  [name: string]: string;
}

export interface EntityParser {
  parse(entity: string): string | undefined;
}

export interface TokenizerOptions {
  loc?: boolean;
  mode?: 'precompile' | 'codemod';
}

export type Attribute = [string, string, boolean];

export interface Location {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

export interface TokenBase<T extends TokenType> {
  type: T;
  syntaxError?: string;
  loc?: Location;
}

export interface Doctype extends TokenBase<TokenType.Doctype> {
  name: string;
  publicIdentifier?: string;
  systemIdentifier?: string;
}

export interface StartTag extends TokenBase<TokenType.StartTag> {
  tagName: string;
  attributes: Attribute[];
  selfClosing: boolean;
}

export interface EndTag extends TokenBase<TokenType.EndTag> {
  tagName: string;
}

export interface Chars extends TokenBase<TokenType.Chars> {
  chars: string;
}

export interface Comment extends TokenBase<TokenType.Comment> {
  chars: string;
}

export type Token = StartTag | EndTag | Chars | Comment | Doctype;

export const enum TokenType {
  Doctype = 'Doctype',
  StartTag = 'StartTag',
  EndTag = 'EndTag',
  Chars = 'Chars',
  Comment = 'Comment'
}

export interface TokenMap {
  StartTag: StartTag;
  EndTag: EndTag;
  Chars: Chars;
  Comment: Comment;
  Doctype: Doctype;
}

export interface TokenizerDelegate {
  reset(): void;
  finishData(): void;
  tagOpen(): void;

  beginDoctype(): void;
  appendToDoctypeName(char: string): void;
  appendToDoctypePublicIdentifier(char: string): void;
  appendToDoctypeSystemIdentifier(char: string): void;
  endDoctype(): void;

  beginData(): void;
  appendToData(char: string): void;

  beginStartTag(): void;
  appendToTagName(char: string): void;

  beginAttribute(): void;
  appendToAttributeName(char: string): void;
  beginAttributeValue(quoted: boolean): void;
  appendToAttributeValue(char: string): void;
  finishAttributeValue(): void;

  markTagAsSelfClosing(): void;

  beginEndTag(): void;
  finishTag(): void;

  beginComment(): void;
  appendToCommentData(char: string): void;
  finishComment(): void;

  reportSyntaxError(error: string): void;
}

export { TokenizerState } from './generated/tokenizer-states';

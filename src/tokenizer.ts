import EventedTokenizer from './evented-tokenizer';
import { unwrap } from './utils';

export interface TokenizerOptions {
  loc?: any;
};

export type Attribute = [string, string, boolean];

export interface Token {
  type: string;
  chars?: string;
  attributes?: Attribute[];
  tagName?: string;
  selfClosing?: boolean;
  loc?: {
    start: {
      line: number;
      column: number;
    },
    end: {
      line: number;
      column: number;
    }
  };
  syntaxError?: string;
}

interface TokenWithAttributes extends Token {
  attributes: Attribute[];
}

export default class Tokenizer {
  private _token: Token | null = null;
  private startLine = 1;
  private startColumn = 0;
  private tokenizer: EventedTokenizer;
  private tokens: Token[] = [];
  private currentAttribute: Attribute | null = null;

  constructor(entityParser, private options: TokenizerOptions = {}) {
    this.tokenizer = new EventedTokenizer(this, entityParser);
  }

  get token(): Token {
    return unwrap(this._token);
  }

  set token(value: Token) {
    this._token = value;
  }

  tokenize(input) {
    this.tokens = [];
    this.tokenizer.tokenize(input);
    return this.tokens;
  }

  tokenizePart(input) {
    this.tokens = [];
    this.tokenizer.tokenizePart(input);
    return this.tokens;
  }

  tokenizeEOF() {
    this.tokens = [];
    this.tokenizer.tokenizeEOF();
    return this.tokens[0];
  }

  reset() {
    this._token = null;
    this.startLine = 1;
    this.startColumn = 0;
  }

  addLocInfo() {
    if (this.options.loc) {
      this.token.loc = {
        start: {
          line: this.startLine,
          column: this.startColumn
        },
        end: {
          line: this.tokenizer.line,
          column: this.tokenizer.column
        }
      };
    }
    this.startLine = this.tokenizer.line;
    this.startColumn = this.tokenizer.column;
  }

  // Data

  beginData() {
    this.token = {
      type: 'Chars',
      chars: ''
    };
    this.tokens.push(this.token);
  }

  appendToData(char) {
    this.token.chars += char;
  }

  finishData() {
    this.addLocInfo();
  }

  // Comment

  beginComment() {
    this.token = {
      type: 'Comment',
      chars: ''
    };
    this.tokens.push(this.token);
  }

  appendToCommentData(char) {
    this.token.chars += char;
  }

  finishComment() {
    this.addLocInfo();
  }

  // Tags - basic

  beginStartTag() {
    this.token = {
      type: 'StartTag',
      tagName: '',
      attributes: [],
      selfClosing: false
    };
    this.tokens.push(this.token);
  }

  beginEndTag() {
    this.token = {
      type: 'EndTag',
      tagName: ''
    };
    this.tokens.push(this.token);
  }

  finishTag() {
    this.addLocInfo();
  }

  markTagAsSelfClosing() {
    this.token.selfClosing = true;
  }

  // Tags - name

  appendToTagName(char) {
    this.token.tagName += char;
  }

  // Tags - attributes

  beginAttribute() {
    let attributes = unwrap(this.token.attributes, "current token's attributs");

    this.currentAttribute = ["", "", false];
    attributes.push(this.currentAttribute);
  }

  appendToAttributeName(char) {
    let currentAttribute = unwrap(this.currentAttribute);
    currentAttribute[0] += char;
  }

  beginAttributeValue(isQuoted) {
    let currentAttribute = unwrap(this.currentAttribute);
    currentAttribute[2] = isQuoted;
  }

  appendToAttributeValue(char) {
    let currentAttribute = unwrap(this.currentAttribute);
    currentAttribute[1] = currentAttribute[1] || "";
    currentAttribute[1] += char;
  }

  finishAttributeValue() {
  }

  reportSyntaxError(message: string) {
    this.token.syntaxError = message;
  }
}

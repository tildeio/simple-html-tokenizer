import EventedTokenizer from './evented-tokenizer';
import {
  Attribute,
  EntityParser,
  Token,
  TokenizerDelegate,
  TokenMap,
  TokenType,
  TokenizerOptions
} from './types';

export default class Tokenizer implements TokenizerDelegate {
  private token: Token | null = null;
  private startLine = 1;
  private startColumn = 0;
  private tokenizer: EventedTokenizer;
  private tokens: Token[] = [];
  private _currentAttribute?: Attribute;

  constructor(
    entityParser: EntityParser,
    private options: TokenizerOptions = {}
  ) {
    this.tokenizer = new EventedTokenizer(this, entityParser);
    this._currentAttribute = undefined;
  }

  tokenize(input: string) {
    this.tokens = [];
    this.tokenizer.tokenize(input);
    return this.tokens;
  }

  tokenizePart(input: string) {
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
    this.token = null;
    this.startLine = 1;
    this.startColumn = 0;
  }

  current<T extends TokenType, U extends TokenType>(
    type1: T,
    type2: U
  ): TokenMap[T] | TokenMap[U];
  current<T extends TokenType>(type: T): TokenMap[T];
  current(): Token;
  current(): Token {
    const token = this.token;
    if (token === null) {
      throw new Error('token was unexpectedly null');
    }
    if (arguments.length === 0) {
      return token;
    }
    for (let i = 0; i < arguments.length; i++) {
      if (token.type === arguments[i]) {
        return token;
      }
    }
    throw new Error(`token type was unexpectedly ${token.type}`);
  }

  push(token: Token) {
    this.token = token;
    this.tokens.push(token);
  }

  currentAttribute() {
    return this._currentAttribute;
  }

  addLocInfo() {
    if (this.options.loc) {
      this.current().loc = {
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
    this.push({
      type: TokenType.Chars,
      chars: ''
    });
  }

  appendToData(char: string) {
    this.current(TokenType.Chars).chars += char;
  }

  finishData() {
    this.addLocInfo();
  }

  // Comment

  beginComment() {
    this.push({
      type: TokenType.Comment,
      chars: ''
    });
  }

  appendToCommentData(char: string) {
    this.current(TokenType.Comment).chars += char;
  }

  finishComment() {
    this.addLocInfo();
  }

  // Tags - basic

  tagOpen() {}

  beginStartTag() {
    this.push({
      type: TokenType.StartTag,
      tagName: '',
      attributes: [],
      selfClosing: false
    });
  }

  beginEndTag() {
    this.push({
      type: TokenType.EndTag,
      tagName: ''
    });
  }

  finishTag() {
    this.addLocInfo();
  }

  markTagAsSelfClosing() {
    this.current(TokenType.StartTag).selfClosing = true;
  }

  // Tags - name
  appendToTagName(char: string) {
    this.current(TokenType.StartTag, TokenType.EndTag).tagName += char;
  }

  // Tags - attributes

  beginAttribute() {
    this._currentAttribute = ['', '', false];
  }

  appendToAttributeName(char: string) {
    this.currentAttribute()![0] += char;
  }

  beginAttributeValue(isQuoted: boolean) {
    this.currentAttribute()![2] = isQuoted;
  }

  appendToAttributeValue(char: string) {
    this.currentAttribute()![1] += char;
  }

  finishAttributeValue() {
    this.current(TokenType.StartTag).attributes.push(this._currentAttribute!);
  }

  reportSyntaxError(message: string) {
    this.current().syntaxError = message;
  }
}

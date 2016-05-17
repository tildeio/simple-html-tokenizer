import EventedTokenizer, {
  Location,
  DelegateOptions,
  Position,
  Char
} from './evented-tokenizer';
import EntityParser from './entity-parser';
import { Option, unwrap, or } from './utils';

type TokenType =
    'Chars'
  | 'Comment'
  | 'StartTag'
  | 'EndTag'
  ;

export interface Token {
  type: TokenType;
  loc: Option<Location>;
}

export interface CharsToken extends Token {
  type: 'Chars' | 'Comment';
  chars: string;
}

export interface TagToken extends Token {
  type: 'StartTag' | 'EndTag';
  tagName: string;
}

export type Attribute = [string, string, boolean];

export interface StartTagToken extends TagToken {
  type: 'StartTag';
  attributes: Attribute[];
  selfClosing: boolean;
}

export interface EndTagToken extends TagToken {
  type: 'EndTag';
}

function unwrapAsToken<T extends Token>(token: Option<Token>, type: TokenType | TokenType[]): T {
  return unwrap(asToken<T>(unwrap(token), type));
}

function asToken<T extends Token>(token: Token | null, type: TokenType | TokenType[]): Option<T> {
  if (token) {
    let tok = token;
    if (Array.isArray(type)) {
      return type.some(t => tok.type === t) ? token as T : null;
    } else {
      return tok.type === type ? token as T : null;
    }
  } else {
    return null;
  }
}

function isToken<T extends Token>(token: Option<Token>, type: TokenType): token is T {
  if (!token) return false;
  return token.type === type;
}

export interface TokenizerOptions {
  loc: boolean;
}

export default class Tokenizer implements DelegateOptions {
  private token: Option<Token> = null;
  private startLine = 1;
  private startColumn = 0;
  private options: TokenizerOptions;
  private tokens: Token[] = [];
  private tokenizer: EventedTokenizer;
  private currentAttribute: Option<Attribute> = null;

  [index: string]: any;

  constructor(entityParser: EntityParser, options?: TokenizerOptions) {
    this.startLine = 1;
    this.startColumn = 0;
    this.options = options || { loc: false };
    this.tokenizer = new EventedTokenizer(this, entityParser);
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

  addLocInfo() {
    if (this.options.loc) {
      unwrap(this.token).loc = {
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
      loc: null,
      type: 'Chars',
      chars: ''
    } as CharsToken;
    this.tokens.push(this.token);
  }

  appendToData(pos: Position, char: Char) {
    let chars = typeof char === 'string' ? char : char.chars;

    unwrapAsToken<CharsToken>(this.token, 'Chars').chars += chars;  
  }

  finishData() {
    this.addLocInfo();
  }

  // Comment

  beginComment() {
    this.token = {
      loc: null,
      type: 'Comment',
      chars: ''
    } as CharsToken;
    this.tokens.push(this.token);
  }

  appendToCommentData(pos: Position, char: string) {
    unwrapAsToken<CharsToken>(this.token, 'Comment').chars += char;
  }

  finishComment() {
    this.addLocInfo();
  }

  // Tags - basic

  openTag(pos: Position, kind: 'start' | 'end') {
    let token: Token;
    
    if (kind === 'start') {
      token = this.token = {
        loc: null,
        type: 'StartTag',
        tagName: '',
        attributes: [],
        selfClosing: false
      } as StartTagToken;      
    } else {
      token = this.token = {
        loc: null,
        type: 'EndTag',
        tagName: ''
      } as EndTagToken
    }

    this.tokens.push(token);
  }

  beginEndTag(pos: Position) {
    this.token = {
      loc: null,
      type: 'EndTag',
      tagName: ''
    } as EndTagToken;
    this.tokens.push(this.token);
  }

  finishTag(pos: Position, selfClosing: boolean) {
    if (isToken<StartTagToken>(this.token, 'StartTag')) {
      this.token.selfClosing = selfClosing;
    }
    this.addLocInfo();
  }

  // Tags - name

  appendToTagName(pos: Position, char: string) {
    unwrapAsToken<TagToken>(this.token, ['StartTag', 'EndTag']).tagName += char;
  }

  // Tags - attributes

  beginAttributeName() {
    this.currentAttribute = ["", "", false];
    unwrapAsToken<StartTagToken>(this.token, 'StartTag').attributes.push(this.currentAttribute);
  }

  appendToAttributeName(pos: Position, char: string) {
    unwrap(this.currentAttribute)[0] += char;
  }

  beginAttributeValue(pos: Position, isQuoted: boolean) {
    unwrap(this.currentAttribute)[2] = isQuoted;
  }

  appendToAttributeValue(pos: Position, char: Char) {
    let attr = unwrap(this.currentAttribute);
    attr[1] = attr[1] || "";
    if (typeof char === 'string') {
      attr[1] += char;
    } else {
      attr[1] += char.chars;
    }
  }
}


import { preprocessInput, isAlpha, isSpace } from './utils';
import {
  StartTag,
  EndTag,
  Chars,
  Comment
} from './tokens';
import EventedTokenizer from './evented-tokenizer';

function Tokenizer(entityParser) {
  this.entityParser = entityParser;
  this.tokenizer = new EventedTokenizer(this);

  this.token = null;
  this.startLine = -1;
  this.startColumn = -1;

  this.reset();
}

Tokenizer.prototype = {
  tokenize: function(input) {
    return this.tokenizer.tokenize(input);
  },

  tokenizePart: function(input) {
    return this.tokenizer.tokenizePart(input);
  },

  tokenizeEOF: function() {
    return this.tokenizer.tokenizeEOF();
  },

  reset: function() {
    this.token = null;
    this.startLine = 1;
    this.startColumn = 0;
  },

  addLocInfo: function(_endLine, _endColumn) {
    var endLine = (_endLine === undefined) ? this.tokenizer.line : _endLine;
    var endColumn = (_endColumn === undefined) ? this.tokenizer.column : _endColumn;

    this.token.loc = {
      start: {
        line: this.startLine,
        column: this.startColumn
      },
      end: {
        line: endLine,
        column: endColumn
      }
    };

    this.startLine = endLine;
    this.startColumn = endColumn;
  },

  createTag: function(Type, char) {
    var lastToken = this.token;
    this.token = new Type(char);
    return lastToken;
  },

  addToTagName: function(char) {
    this.token.tagName += char;
  },

  selfClosing: function() {
    this.token.selfClosing = true;
  },

  createAttribute: function(char) {
    this._currentAttribute = [char.toLowerCase(), "", null];
    this.token.attributes.push(this._currentAttribute);
    this.tokenizer.state = 'attributeName';
  },

  addToAttributeName: function(char) {
    this._currentAttribute[0] += char;
  },

  markAttributeQuoted: function(value) {
    this._currentAttribute[2] = value;
  },

  finalizeAttributeValue: function() {
    if (this._currentAttribute) {
      if (this._currentAttribute[2] === null) {
        this._currentAttribute[2] = false;
      }
      this._currentAttribute = undefined;
    }
  },

  addToAttributeValue: function(char) {
    this._currentAttribute[1] = this._currentAttribute[1] || "";
    this._currentAttribute[1] += char;
  },

  createComment: function() {
    var lastToken = this.token;
    this.token = new Comment();
    this.tokenizer.state = 'commentStart';
    return lastToken;
  },

  addToComment: function(char) {
    this.addChar(char);
  },

  addChar: function(char) {
    this.token.chars += char;
  },

  finalizeToken: function() {
    if (this.token.type === 'StartTag') {
      this.finalizeAttributeValue();
    }
  },

  emitData: function() {
    var token = this.token;
    if (token) {
      this.addLocInfo(this.tokenizer.line, this.tokenizer.column - 1);
    }

    this.token = null;
    this.tokenizer.state = 'tagOpen';

    return token;
  },

  emitToken: function() {
    var token = this.token;
    if (token) {
      this.addLocInfo();
      this.finalizeToken();
    }

    this.token = null;
    this.tokenizer.state = 'data';

    return token;
  },

  addData: function(char) {
    if (this.token === null) {
      this.token = new Chars();
    }

    this.addChar(char);
  },

  consumeCharRef: function() {
    return this.entityParser.parse(this.tokenizer);
  }
};

export default Tokenizer;

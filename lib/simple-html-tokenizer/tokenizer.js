import { preprocessInput, isAlpha, isSpace } from './utils';
import {
  StartTag,
  EndTag,
  Chars,
  Comment
} from './tokens';

function Tokenizer(input, entityParser) {
  this.input = preprocessInput(input);
  this.entityParser = entityParser;
  this.char = 0;
  this.line = 1;
  this.column = 0;

  this.state = 'data';
  this.token = null;
}

Tokenizer.prototype = {
  tokenize: function() {
    var tokens = [], token;

    while (true) {
      token = this.lex();
      if (token === 'EOF') { break; }
      if (token) { tokens.push(token); }
    }

    if (this.token) {
      tokens.push(this.token);
    }

    return tokens;
  },

  tokenizePart: function(string) {
    this.input += preprocessInput(string);
    var tokens = [], token;

    while (this.char < this.input.length) {
      token = this.lex();
      if (token) { tokens.push(token); }
    }

    this.tokens = (this.tokens || []).concat(tokens);
    return tokens;
  },

  tokenizeEOF: function() {
    var token = this.token;
    if (token) {
      this.token = null;
      return token;
    }
  },

  tag: function(Type, char) {
    var lastToken = this.token;
    this.token = new Type(char);
    this.state = 'tagName';
    return lastToken;
  },

  selfClosing: function() {
    this.token.selfClosing = true;
  },

  attribute: function(char) {
    this.token.startAttribute(char);
    this.state = 'attributeName';
  },

  addToAttributeName: function(char) {
    this.token.addToAttributeName(char);
  },

  markAttributeQuoted: function(value) {
    this.token.markAttributeQuoted(value);
  },

  finalizeAttributeValue: function() {
    this.token.finalizeAttributeValue();
  },

  addToAttributeValue: function(char) {
    this.token.addToAttributeValue(char);
  },

  commentStart: function() {
    var lastToken = this.token;
    this.token = new Comment();
    this.state = 'commentStart';
    return lastToken;
  },

  addToComment: function(char) {
    this.token.addChar(char);
  },

  emitData: function() {
    this.addLocInfo(this.line, this.column - 1);
    var lastToken = this.token;
    this.token = null;
    this.state = 'tagOpen';
    return lastToken;
  },

  emitToken: function() {
    this.addLocInfo();
    var lastToken = this.token.finalize();
    this.token = null;
    this.state = 'data';
    return lastToken;
  },

  addData: function(char) {
    if (this.token === null) {
      this.token = new Chars();
      this.markFirst();
    }

    this.token.addChar(char);
  },

  markFirst: function(line, column) {
    this.firstLine = (line === 0) ? 0 : (line || this.line);
    this.firstColumn = (column === 0) ? 0 : (column || this.column);
  },

  addLocInfo: function(line, column) {
    if (!this.token) {
      return;
    }
    this.token.firstLine = this.firstLine;
    this.token.firstColumn = this.firstColumn;
    this.token.lastLine = (line === 0) ? 0 : (line || this.line);
    this.token.lastColumn = (column === 0) ? 0 : (column || this.column);
  },

  consumeCharRef: function() {
    return this.entityParser.parse(this);
  },

  lex: function() {
    var char = this.input.charAt(this.char++);

    if (char) {
      if (char === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      // console.log(this.state, char);
      return this.states[this.state].call(this, char);
    } else {
      this.addLocInfo(this.line, this.column);
      return 'EOF';
    }
  },

  states: {
    data: function(char) {
      if (char === "<") {
        var chars = this.emitData();
        this.markFirst();
        return chars;
      } else if (char === "&") {
        this.addData(this.consumeCharRef() || "&");
      } else {
        this.addData(char);
      }
    },

    tagOpen: function(char) {
      if (char === "!") {
        this.state = 'markupDeclaration';
      } else if (char === "/") {
        this.state = 'endTagOpen';
      } else if (isAlpha(char)) {
        return this.tag(StartTag, char.toLowerCase());
      }
    },

    markupDeclaration: function(char) {
      if (char === "-" && this.input.charAt(this.char) === "-") {
        this.char++;
        this.commentStart();
      }
    },

    commentStart: function(char) {
      if (char === "-") {
        this.state = 'commentStartDash';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToComment(char);
        this.state = 'comment';
      }
    },

    commentStartDash: function(char) {
      if (char === "-") {
        this.state = 'commentEnd';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToComment("-");
        this.state = 'comment';
      }
    },

    comment: function(char) {
      if (char === "-") {
        this.state = 'commentEndDash';
      } else {
        this.addToComment(char);
      }
    },

    commentEndDash: function(char) {
      if (char === "-") {
        this.state = 'commentEnd';
      } else {
        this.addToComment("-" + char);
        this.state = 'comment';
      }
    },

    commentEnd: function(char) {
      if (char === ">") {
        return this.emitToken();
      } else {
        this.addToComment("--" + char);
        this.state = 'comment';
      }
    },

    tagName: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.token.addToTagName(char);
      }
    },

    beforeAttributeName: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.attribute(char);
      }
    },

    attributeName: function(char) {
      if (isSpace(char)) {
        this.state = 'afterAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToAttributeName(char);
      }
    },

    afterAttributeName: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.finalizeAttributeValue();
        this.attribute(char);
      }
    },

    beforeAttributeValue: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === '"') {
        this.state = 'attributeValueDoubleQuoted';
        this.markAttributeQuoted(true);
      } else if (char === "'") {
        this.state = 'attributeValueSingleQuoted';
        this.markAttributeQuoted(true);
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.state = 'attributeValueUnquoted';
        this.markAttributeQuoted(false);
        this.addToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted: function(char) {
      if (char === '"') {
        this.finalizeAttributeValue();
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.addToAttributeValue(this.consumeCharRef('"') || "&");
      } else {
        this.addToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted: function(char) {
      if (char === "'") {
        this.finalizeAttributeValue();
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.addToAttributeValue(this.consumeCharRef("'") || "&");
      } else {
        this.addToAttributeValue(char);
      }
    },

    attributeValueUnquoted: function(char) {
      if (isSpace(char)) {
        this.finalizeAttributeValue();
        this.state = 'beforeAttributeName';
      } else if (char === "&") {
        this.addToAttributeValue(this.consumeCharRef(">") || "&");
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.addToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitToken();
      } else {
        this.char--;
        this.state = 'beforeAttributeName';
      }
    },

    selfClosingStartTag: function(char) {
      if (char === ">") {
        this.selfClosing();
        return this.emitToken();
      } else {
        this.char--;
        this.state = 'beforeAttributeName';
      }
    },

    endTagOpen: function(char) {
      if (isAlpha(char)) {
        this.tag(EndTag, char.toLowerCase());
      }
    }
  }
};

export default Tokenizer;

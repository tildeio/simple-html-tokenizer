import { preprocessInput, isAlpha, isSpace } from './utils';
import {
  StartTag,
  EndTag,
  Chars,
  Comment
} from './tokens';

function EventedTokenizer(delegate) {
  this.delegate = delegate;

  this.state = null;
  this.input = null;

  this.index = -1;
  this.line = -1;
  this.column = -1;

  this.reset();
}

EventedTokenizer.prototype = {
  reset: function() {
    this.state = 'data';
    this.input = '';

    this.index = 0;
    this.line = 1;
    this.column = 0;

    this.delegate.reset();
  },

  tokenize: function(input) {
    this.reset();

    var tokens = this.tokenizePart(input);
    var trailingToken = this.tokenizeEOF();

    if (trailingToken) {
      tokens.push(trailingToken);
    }

    return tokens;
  },

  tokenizePart: function(input) {
    this.input += preprocessInput(input);

    var tokens = [];

    while (true) {
      var token = this.lex();

      if (token) {
        tokens.push(token);
      } else {
        break;
      }
    }

    return tokens;
  },

  tokenizeEOF: function() {
    return this.delegate.emitToken();
  },

  lex: function() {
    while (this.index < this.input.length) {
      var char = this.input.charAt(this.index++);
      if (char) {
        if (char === "\n") {
          this.line++;
          this.column = 0;
        } else {
          this.column++;
        }

        var token = this.states[this.state].call(this, char);
        if (token) {
          return token;
        }
      }
    }
  },

  states: {
    data: function(char) {
      if (char === "<") {
        var chars = this.delegate.emitData();
        return chars;
      } else if (char === "&") {
        var charRef = this.delegate.consumeCharRef() || "&";
        this.delegate.addData(charRef);
      } else {
        this.delegate.addData(char);
      }
    },

    tagOpen: function(char) {
      if (char === "!") {
        this.state = 'markupDeclaration';
      } else if (char === "/") {
        this.state = 'endTagOpen';
      } else if (isAlpha(char)) {
        this.state = 'tagName';
        return this.delegate.createTag(StartTag, char.toLowerCase());
      }
    },

    markupDeclaration: function(char) {
      if (char === "-" && this.input.charAt(this.index) === "-") {
        this.index++;
        this.delegate.createComment();
      }
    },

    commentStart: function(char) {
      if (char === "-") {
        this.state = 'commentStartDash';
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.delegate.addToComment(char);
        this.state = 'comment';
      }
    },

    commentStartDash: function(char) {
      if (char === "-") {
        this.state = 'commentEnd';
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.delegate.addToComment("-");
        this.state = 'comment';
      }
    },

    comment: function(char) {
      if (char === "-") {
        this.state = 'commentEndDash';
      } else {
        this.delegate.addToComment(char);
      }
    },

    commentEndDash: function(char) {
      if (char === "-") {
        this.state = 'commentEnd';
      } else {
        this.delegate.addToComment("-" + char);
        this.state = 'comment';
      }
    },

    commentEnd: function(char) {
      if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.delegate.addToComment("--" + char);
        this.state = 'comment';
      }
    },

    tagName: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.delegate.addToTagName(char);
      }
    },

    beforeAttributeName: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.delegate.createAttribute(char);
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
        return this.delegate.emitToken();
      } else {
        this.delegate.addToAttributeName(char);
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
        return this.delegate.emitToken();
      } else {
        this.delegate.finalizeAttributeValue();
        this.delegate.createAttribute(char);
      }
    },

    beforeAttributeValue: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === '"') {
        this.state = 'attributeValueDoubleQuoted';
        this.delegate.markAttributeQuoted(true);
      } else if (char === "'") {
        this.state = 'attributeValueSingleQuoted';
        this.delegate.markAttributeQuoted(true);
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.state = 'attributeValueUnquoted';
        this.delegate.markAttributeQuoted(false);
        this.delegate.addToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted: function(char) {
      if (char === '"') {
        this.delegate.finalizeAttributeValue();
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.delegate.addToAttributeValue(this.delegate.consumeCharRef('"') || "&");
      } else {
        this.delegate.addToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted: function(char) {
      if (char === "'") {
        this.delegate.finalizeAttributeValue();
        this.state = 'afterAttributeValueQuoted';
      } else if (char === "&") {
        this.delegate.addToAttributeValue(this.delegate.consumeCharRef("'") || "&");
      } else {
        this.delegate.addToAttributeValue(char);
      }
    },

    attributeValueUnquoted: function(char) {
      if (isSpace(char)) {
        this.delegate.finalizeAttributeValue();
        this.state = 'beforeAttributeName';
      } else if (char === "&") {
        this.delegate.addToAttributeValue(this.delegate.consumeCharRef(">") || "&");
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.delegate.addToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.delegate.emitToken();
      } else {
        this.index--;
        this.state = 'beforeAttributeName';
      }
    },

    selfClosingStartTag: function(char) {
      if (char === ">") {
        this.delegate.selfClosing();
        return this.delegate.emitToken();
      } else {
        this.index--;
        this.state = 'beforeAttributeName';
      }
    },

    endTagOpen: function(char) {
      if (isAlpha(char)) {
        this.state = 'tagName';
        this.delegate.createTag(EndTag, char.toLowerCase());
      }
    }
  }
};

export default EventedTokenizer;

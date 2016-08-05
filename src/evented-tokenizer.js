import { preprocessInput, isAlpha, isSpace } from './utils';

class EventedTokenizer {
  constructor(delegate, entityParser) {
    this.delegate = delegate;
    this.entityParser = entityParser;

    this.state = null;
    this.input = null;

    this.index = -1;
    this.line = -1;
    this.column = -1;
    this.tagLine = -1;
    this.tagColumn = -1;

    this.states = {
      beforeData() {
        var char = this.peek();

        if (char === "<") {
          this.state = 'tagOpen';
          this.markTagStart();
          this.consume();
        } else {
          this.state = 'data';
          this.delegate.beginData();
        }
      },

      data() {
        var char = this.peek();

        if (char === "<") {
          this.delegate.finishData();
          this.state = 'tagOpen';
          this.markTagStart();
          this.consume(); 
        } else if (char === "&") {
          this.consume();
          this.delegate.appendToData(this.consumeCharRef() || "&");
        } else {
          this.consume();
          this.delegate.appendToData(char);
        }
      },

      tagOpen() {
        var char = this.consume();

        if (char === "!") {
          this.state = 'markupDeclaration';
        } else if (char === "/") {
          this.state = 'endTagOpen';
        } else if (isAlpha(char)) {
          this.state = 'tagName';
          this.delegate.beginStartTag();
          this.delegate.appendToTagName(char.toLowerCase());
        }
      },

      markupDeclaration() {
        var char = this.consume();

        if (char === "-" && this.input.charAt(this.index) === "-") {
          this.consume();
          this.state = 'commentStart';
          this.delegate.beginComment();
        }
      },

      commentStart() {
        var char = this.consume();

        if (char === "-") {
          this.state = 'commentStartDash';
        } else if (char === ">") {
          this.delegate.finishComment();
          this.state = 'beforeData';
        } else {
          this.delegate.appendToCommentData(char);
          this.state = 'comment';
        }
      },

      commentStartDash() {
        var char = this.consume();

        if (char === "-") {
          this.state = 'commentEnd';
        } else if (char === ">") {
          this.delegate.finishComment();
          this.state = 'beforeData';
        } else {
          this.delegate.appendToCommentData("-");
          this.state = 'comment';
        }
      },

      comment() {
        var char = this.consume();

        if (char === "-") {
          this.state = 'commentEndDash';
        } else {
          this.delegate.appendToCommentData(char);
        }
      },

      commentEndDash() {
        var char = this.consume();

        if (char === "-") {
          this.state = 'commentEnd';
        } else {
          this.delegate.appendToCommentData("-" + char);
          this.state = 'comment';
        }
      },

      commentEnd() {
        var char = this.consume();

        if (char === ">") {
          this.delegate.finishComment();
          this.state = 'beforeData';
        } else {
          this.delegate.appendToCommentData("--" + char);
          this.state = 'comment';
        }
      },

      tagName() {
        var char = this.consume();

        if (isSpace(char)) {
          this.state = 'beforeAttributeName';
        } else if (char === "/") {
          this.state = 'selfClosingStartTag';
        } else if (char === ">") {
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else {
          this.delegate.appendToTagName(char);
        }
      },

      beforeAttributeName() {
        var char = this.peek();

        if (isSpace(char)) {
          this.consume();
          return;
        } else if (char === "/") {
          this.state = 'selfClosingStartTag';
          this.consume();
        } else if (char === ">") {
          this.consume();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else if (char === '=') {
          this.delegate.reportSyntaxError("attribute name cannot start with equals sign");
          this.state = 'attributeName';
          this.delegate.beginAttribute();
          this.consume();
          this.delegate.appendToAttributeName(char);
        } else {
          this.state = 'attributeName';
          this.delegate.beginAttribute();
        }
      },

      attributeName() {
        var char = this.peek();

        if (isSpace(char)) {
          this.state = 'afterAttributeName';
          this.consume();
        } else if (char === "/") {
          this.delegate.beginAttributeValue(false);
          this.delegate.finishAttributeValue();
          this.consume();
          this.state = 'selfClosingStartTag';
        } else if (char === "=") {
          this.state = 'beforeAttributeValue';
          this.consume();
        } else if (char === ">") {
          this.delegate.beginAttributeValue(false);
          this.delegate.finishAttributeValue();
          this.consume();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else if (char === '"' || char === "'" || char === '<') {
          this.delegate.reportSyntaxError(char + " is not a valid character within attribute names");
          this.consume();
          this.delegate.appendToAttributeName(char);
        } else {
          this.consume();
          this.delegate.appendToAttributeName(char);
        }
      },

      afterAttributeName() {
        var char = this.peek();

        if (isSpace(char)) {
          this.consume();
          return;
        } else if (char === "/") {
          this.delegate.beginAttributeValue(false);
          this.delegate.finishAttributeValue();
          this.consume();
          this.state = 'selfClosingStartTag';
        } else if (char === "=") {
          this.consume();
          this.state = 'beforeAttributeValue';
        } else if (char === ">") {
          this.delegate.beginAttributeValue(false);
          this.delegate.finishAttributeValue();
          this.consume();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else {
          this.delegate.beginAttributeValue(false);
          this.delegate.finishAttributeValue();
          this.consume();
          this.state = 'attributeName';
          this.delegate.beginAttribute();
          this.delegate.appendToAttributeName(char);
        }
      },

      beforeAttributeValue() {
        var char = this.peek();

        if (isSpace(char)) {
          this.consume();
        } else if (char === '"') {
          this.state = 'attributeValueDoubleQuoted';
          this.delegate.beginAttributeValue(true);
          this.consume();
        } else if (char === "'") {
          this.state = 'attributeValueSingleQuoted';
          this.delegate.beginAttributeValue(true);
          this.consume();
        } else if (char === ">") {
          this.delegate.beginAttributeValue(false);
          this.delegate.finishAttributeValue();
          this.consume();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else {
          this.state = 'attributeValueUnquoted';
          this.delegate.beginAttributeValue(false);
          this.consume();
          this.delegate.appendToAttributeValue(char);
        }
      },

      attributeValueDoubleQuoted() {
        var char = this.consume();

        if (char === '"') {
          this.delegate.finishAttributeValue();
          this.state = 'afterAttributeValueQuoted';
        } else if (char === "&") {
          this.delegate.appendToAttributeValue(this.consumeCharRef('"') || "&");
        } else {
          this.delegate.appendToAttributeValue(char);
        }
      },

      attributeValueSingleQuoted() {
        var char = this.consume();

        if (char === "'") {
          this.delegate.finishAttributeValue();
          this.state = 'afterAttributeValueQuoted';
        } else if (char === "&") {
          this.delegate.appendToAttributeValue(this.consumeCharRef("'") || "&");
        } else {
          this.delegate.appendToAttributeValue(char);
        }
      },

      attributeValueUnquoted() {
        var char = this.peek();

        if (isSpace(char)) {
          this.delegate.finishAttributeValue();
          this.consume();
          this.state = 'beforeAttributeName';
        } else if (char === "&") {
          this.consume();
          this.delegate.appendToAttributeValue(this.consumeCharRef(">") || "&");
        } else if (char === ">") {
          this.delegate.finishAttributeValue();
          this.consume();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else {
          this.consume();
          this.delegate.appendToAttributeValue(char);
        }
      },

      afterAttributeValueQuoted() {
        var char = this.peek();

        if (isSpace(char)) {
          this.consume();
          this.state = 'beforeAttributeName';
        } else if (char === "/") {
          this.consume();
          this.state = 'selfClosingStartTag';
        } else if (char === ">") {
          this.consume();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else {
          this.state = 'beforeAttributeName';
        }
      },

      selfClosingStartTag() {
        var char = this.peek();

        if (char === ">") {
          this.consume();
          this.delegate.markTagAsSelfClosing();
          this.delegate.finishTag();
          this.state = 'beforeData';
        } else {
          this.state = 'beforeAttributeName';
        }
      },

      endTagOpen() {
        var char = this.consume();

        if (isAlpha(char)) {
          this.state = 'tagName';
          this.delegate.beginEndTag();
          this.delegate.appendToTagName(char.toLowerCase());
        }
      }
    };
  }

  reset() {
    this.state = 'beforeData';
    this.input = '';

    this.index = 0;
    this.line = 1;
    this.column = 0;

    this.tagLine = -1;
    this.tagColumn = -1;

    this.delegate.reset();
  }

  tokenize(input) {
    this.reset();
    this.tokenizePart(input);
    this.tokenizeEOF();
  }

  tokenizePart(input) {
    this.input += preprocessInput(input);

    while (this.index < this.input.length) {
      this.states[this.state].call(this);
    }
  }

  tokenizeEOF() {
    this.flushData();
  }

  flushData() {
    if (this.state === 'data') {
      this.delegate.finishData();
      this.state = 'beforeData';
    }
  }

  peek() {
    return this.input.charAt(this.index);
  }

  consume() {
    let char = this.peek();

    this.index++;

    if (char === "\n") {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }

    return char;
  }

  consumeCharRef() {
    let endIndex = this.input.indexOf(';', this.index);
    if (endIndex === -1) {
      return;
    }
    let entity = this.input.slice(this.index, endIndex);
    let chars = this.entityParser.parse(entity);
    if (chars) {
      let count = entity.length;
      // consume the entity chars
      while (count) {
        this.consume();
        count--;
      }
      // consume the `;`
      this.consume();

      return chars;
    }
  }

  markTagStart() {
    // these properties to be removed in next major bump
    this.tagLine = this.line;
    this.tagColumn = this.column;

    if (this.delegate.tagOpen) {
      this.delegate.tagOpen();
    }
  }
}

export default EventedTokenizer;

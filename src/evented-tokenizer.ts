import { preprocessInput, isAlpha, isSpace } from './utils';

export type States = 'beforeData' | 'data' | 'tagOpen' | 'endTagOpen' | 'markupDeclaration' | 'commentStart' | 'comment' | 'commentStartDash' | 'commentEnd' | 'commentEndDash' | 'beforeAttributeName' | 'attributeName' | 'afterAttributeName' | 'selfClosingStartTag' | 'attributeValueDoubleQuoted' | 'attributeValueSingleQuoted' |
'attributeValueUnquoted' | 'attributeValueQuoted';

export interface EntityParser {
  parse(entity: string): string | undefined;
}

export interface TokenizerDelegate {
  reset(): void;
  finishData(): void;
  tagOpen?(): void;

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

export default class EventedTokenizer {
  public state: States = 'beforeData';

  public line = -1;
  public column = -1;
  public tagLine = -1;
  public tagColumn = -1;

  private input = '';
  private index = -1;

  constructor(private delegate: TokenizerDelegate, private entityParser: EntityParser) {
    this.reset();
  }

  reset() {
    this.transitionTo('beforeData');
    this.input = '';

    this.index = 0;
    this.line = 1;
    this.column = 0;

    this.tagLine = -1;
    this.tagColumn = -1;

    this.delegate.reset();
  }

  transitionTo(state: States) {
    this.state = state;
  }

  tokenize(input: string) {
    this.reset();
    this.tokenizePart(input);
    this.tokenizeEOF();
  }

  tokenizePart(input: string) {
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
      this.transitionTo('beforeData');
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

  states: {
    [state: string]: (this: EventedTokenizer) => void
  } = {
    beforeData() {
      let char = this.peek();

      if (char === "<") {
        this.transitionTo('tagOpen');
        this.markTagStart();
        this.consume();
      } else {
        this.transitionTo('data');
        this.delegate.beginData();
      }
    },

    data() {
      let char = this.peek();

      if (char === "<") {
        this.delegate.finishData();
        this.transitionTo('tagOpen');
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
      let char = this.consume();

      if (char === "!") {
        this.transitionTo('markupDeclaration');
      } else if (char === "/") {
        this.transitionTo('endTagOpen');
      } else if (isAlpha(char)) {
        this.transitionTo('tagName');
        this.delegate.beginStartTag();
        this.delegate.appendToTagName(char.toLowerCase());
      }
    },

    markupDeclaration() {
      let char = this.consume();

      if (char === "-" && this.input.charAt(this.index) === "-") {
        this.consume();
        this.transitionTo('commentStart');
        this.delegate.beginComment();
      }
    },

    commentStart() {
      let char = this.consume();

      if (char === "-") {
        this.transitionTo('commentStartDash');
      } else if (char === ">") {
        this.delegate.finishComment();
        this.transitionTo('beforeData');
      } else {
        this.delegate.appendToCommentData(char);
        this.transitionTo('comment');
      }
    },

    commentStartDash() {
      let char = this.consume();

      if (char === "-") {
        this.transitionTo('commentEnd');
      } else if (char === ">") {
        this.delegate.finishComment();
        this.transitionTo('beforeData');
      } else {
        this.delegate.appendToCommentData("-");
        this.transitionTo('comment');
      }
    },

    comment() {
      let char = this.consume();

      if (char === "-") {
        this.transitionTo('commentEndDash');
      } else {
        this.delegate.appendToCommentData(char);
      }
    },

    commentEndDash() {
      let char = this.consume();

      if (char === "-") {
        this.transitionTo('commentEnd');
      } else {
        this.delegate.appendToCommentData("-" + char);
        this.transitionTo('comment');
      }
    },

    commentEnd() {
      let char = this.consume();

      if (char === ">") {
        this.delegate.finishComment();
        this.transitionTo('beforeData');
      } else {
        this.delegate.appendToCommentData("--" + char);
        this.transitionTo('comment');
      }
    },

    tagName() {
      let char = this.consume();

      if (isSpace(char)) {
        this.transitionTo('beforeAttributeName');
      } else if (char === "/") {
        this.transitionTo('selfClosingStartTag');
      } else if (char === ">") {
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else {
        this.delegate.appendToTagName(char);
      }
    },

    beforeAttributeName() {
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
        return;
      } else if (char === "/") {
        this.transitionTo('selfClosingStartTag');
        this.consume();
      } else if (char === ">") {
        this.consume();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else if (char === '=') {
        this.delegate.reportSyntaxError("attribute name cannot start with equals sign");
        this.transitionTo('attributeName');
        this.delegate.beginAttribute();
        this.consume();
        this.delegate.appendToAttributeName(char);
      } else {
        this.transitionTo('attributeName');
        this.delegate.beginAttribute();
      }
    },

    attributeName() {
      let char = this.peek();

      if (isSpace(char)) {
        this.transitionTo('afterAttributeName');
        this.consume();
      } else if (char === "/") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo('selfClosingStartTag');
      } else if (char === "=") {
        this.transitionTo('beforeAttributeValue');
        this.consume();
      } else if (char === ">") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
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
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
        return;
      } else if (char === "/") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo('selfClosingStartTag');
      } else if (char === "=") {
        this.consume();
        this.transitionTo('beforeAttributeValue');
      } else if (char === ">") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo('attributeName');
        this.delegate.beginAttribute();
        this.delegate.appendToAttributeName(char);
      }
    },

    beforeAttributeValue() {
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
      } else if (char === '"') {
        this.transitionTo('attributeValueDoubleQuoted');
        this.delegate.beginAttributeValue(true);
        this.consume();
      } else if (char === "'") {
        this.transitionTo('attributeValueSingleQuoted');
        this.delegate.beginAttributeValue(true);
        this.consume();
      } else if (char === ">") {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else {
        this.transitionTo('attributeValueUnquoted');
        this.delegate.beginAttributeValue(false);
        this.consume();
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted() {
      let char = this.consume();

      if (char === '"') {
        this.delegate.finishAttributeValue();
        this.transitionTo('afterAttributeValueQuoted');
      } else if (char === "&") {
        this.delegate.appendToAttributeValue(this.consumeCharRef() || "&");
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted() {
      let char = this.consume();

      if (char === "'") {
        this.delegate.finishAttributeValue();
        this.transitionTo('afterAttributeValueQuoted');
      } else if (char === "&") {
        this.delegate.appendToAttributeValue(this.consumeCharRef() || "&");
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueUnquoted() {
      let char = this.peek();

      if (isSpace(char)) {
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo('beforeAttributeName');
      } else if (char === "&") {
        this.consume();
        this.delegate.appendToAttributeValue(this.consumeCharRef() || "&");
      } else if (char === ">") {
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else {
        this.consume();
        this.delegate.appendToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted() {
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
        this.transitionTo('beforeAttributeName');
      } else if (char === "/") {
        this.consume();
        this.transitionTo('selfClosingStartTag');
      } else if (char === ">") {
        this.consume();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else {
        this.transitionTo('beforeAttributeName');
      }
    },

    selfClosingStartTag() {
      let char = this.peek();

      if (char === ">") {
        this.consume();
        this.delegate.markTagAsSelfClosing();
        this.delegate.finishTag();
        this.transitionTo('beforeData');
      } else {
        this.transitionTo('beforeAttributeName');
      }
    },

    endTagOpen() {
      let char = this.consume();

      if (isAlpha(char)) {
        this.transitionTo('tagName');
        this.delegate.beginEndTag();
        this.delegate.appendToTagName(char.toLowerCase());
      }
    }
  };
}

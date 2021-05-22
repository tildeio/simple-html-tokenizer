import { preprocessInput, isAlpha, isSpace } from './utils';
import { EntityParser, TokenizerDelegate, TokenizerState } from './types';

export default class EventedTokenizer {
  public state: TokenizerState = TokenizerState.beforeData;

  public line = -1;
  public column = -1;

  private input = '';
  private index = -1;

  private tagNameBuffer = '';

  constructor(
    private delegate: TokenizerDelegate,
    private entityParser: EntityParser,
    private mode: 'codemod' | 'precompile' = 'precompile'
  ) {
    this.reset();
  }

  reset() {
    this.transitionTo(TokenizerState.beforeData);
    this.input = '';
    this.tagNameBuffer = '';

    this.index = 0;
    this.line = 1;
    this.column = 0;

    this.delegate.reset();
  }

  transitionTo(state: TokenizerState) {
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
      let handler = this.states[this.state];
      if (handler !== undefined) {
        handler.call(this);
      } else {
        throw new Error(`unhandled state ${this.state}`);
      }
    }
  }

  tokenizeEOF() {
    this.flushData();
  }

  flushData() {
    if (this.state === 'data') {
      this.delegate.finishData();
      this.transitionTo(TokenizerState.beforeData);
    }
  }

  peek() {
    return this.input.charAt(this.index);
  }

  consume() {
    let char = this.peek();

    this.index++;

    if (char === '\n') {
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
    this.delegate.tagOpen();
  }

  private appendToTagName(char: string) : void {
    this.tagNameBuffer += char;
    this.delegate.appendToTagName(char);
  }

  private isIgnoredEndTag(): boolean {
    let tag = this.tagNameBuffer;

    return (tag === 'title' && this.input.substring(this.index, this.index + 8) !== '</title>') ||
      (tag === 'style' && this.input.substring(this.index, this.index + 8) !== '</style>') ||
      (tag === 'script' && this.input.substring(this.index, this.index + 9) !== '<\/script>');
  }

  states: { [k in TokenizerState]?: (this: EventedTokenizer) => void } = {
    beforeData() {
      let char = this.peek();

      if (char === '<' && !this.isIgnoredEndTag()) {
        this.transitionTo(TokenizerState.tagOpen);
        this.markTagStart();
        this.consume();
      } else {
        if (this.mode === 'precompile' && char === '\n') {
          let tag = this.tagNameBuffer.toLowerCase();

          if (tag === 'pre' || tag === 'textarea') {
            this.consume();
          }
        }

        this.transitionTo(TokenizerState.data);
        this.delegate.beginData();
      }
    },

    data() {
      let char = this.peek();
      let tag = this.tagNameBuffer;

      if (char === '<' && !this.isIgnoredEndTag()) {
        this.delegate.finishData();
        this.transitionTo(TokenizerState.tagOpen);
        this.markTagStart();
        this.consume();
      } else if (char === '&' && tag !== 'script' && tag !== 'style') {
        this.consume();
        this.delegate.appendToData(this.consumeCharRef() || '&');
      } else {
        this.consume();
        this.delegate.appendToData(char);
      }
    },

    tagOpen() {
      let char = this.consume();

      if (char === '!') {
        this.transitionTo(TokenizerState.markupDeclarationOpen);
      } else if (char === '/') {
        this.transitionTo(TokenizerState.endTagOpen);
      } else if (char === '@' || char === ':' || isAlpha(char)) {
        this.transitionTo(TokenizerState.tagName);
        this.tagNameBuffer = '';
        this.delegate.beginStartTag();
        this.appendToTagName(char);
      }
    },

    markupDeclarationOpen() {
      let char = this.consume();

      if (char === '-' && this.peek() === '-') {
        this.consume();
        this.transitionTo(TokenizerState.commentStart);
        this.delegate.beginComment();
      } else {
        let maybeDoctype = char.toUpperCase() + this.input.substring(this.index, this.index + 6).toUpperCase();

        if (maybeDoctype === 'DOCTYPE') {
          this.consume();
          this.consume();
          this.consume();
          this.consume();
          this.consume();
          this.consume();
          this.transitionTo(TokenizerState.doctype);
          if (this.delegate.beginDoctype) this.delegate.beginDoctype();
        }
      }
    },

    doctype() {
      let char = this.consume();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.beforeDoctypeName);
      }
    },

    beforeDoctypeName() {
      let char = this.consume();

      if (isSpace(char)) {
        return;
      } else {
        this.transitionTo(TokenizerState.doctypeName);
        if (this.delegate.appendToDoctypeName) this.delegate.appendToDoctypeName(char.toLowerCase());
      }
    },

    doctypeName() {
      let char = this.consume();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.afterDoctypeName);
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        if (this.delegate.appendToDoctypeName) this.delegate.appendToDoctypeName(char.toLowerCase());
      }
    },

    afterDoctypeName() {
      let char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        let nextSixChars = char.toUpperCase() + this.input.substring(this.index, this.index + 5).toUpperCase();

        let isPublic = nextSixChars.toUpperCase() === 'PUBLIC';
        let isSystem = nextSixChars.toUpperCase() === 'SYSTEM';

        if (isPublic || isSystem) {
          this.consume();
          this.consume();
          this.consume();
          this.consume();
          this.consume();
          this.consume();
        }

        if (isPublic) {
          this.transitionTo(TokenizerState.afterDoctypePublicKeyword);
        } else if (isSystem) {
          this.transitionTo(TokenizerState.afterDoctypeSystemKeyword);
        }
      }
    },

    afterDoctypePublicKeyword() {
      let char = this.peek();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.beforeDoctypePublicIdentifier);
        this.consume();
      } else if (char === '"') {
        this.transitionTo(TokenizerState.doctypePublicIdentifierDoubleQuoted);
        this.consume();
      } else if (char === "'") {
        this.transitionTo(TokenizerState.doctypePublicIdentifierSingleQuoted);
        this.consume();
      } else if (char === '>') {
        this.consume();
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      }
    },

    doctypePublicIdentifierDoubleQuoted() {
      let char = this.consume();

      if (char === '"') {
        this.transitionTo(TokenizerState.afterDoctypePublicIdentifier);
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        if (this.delegate.appendToDoctypePublicIdentifier) this.delegate.appendToDoctypePublicIdentifier(char);
      }
    },

    doctypePublicIdentifierSingleQuoted() {
      let char = this.consume();

      if (char === "'") {
        this.transitionTo(TokenizerState.afterDoctypePublicIdentifier);
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        if (this.delegate.appendToDoctypePublicIdentifier) this.delegate.appendToDoctypePublicIdentifier(char);
      }
    },

    afterDoctypePublicIdentifier() {
      let char = this.consume();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.betweenDoctypePublicAndSystemIdentifiers);
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else if (char === '"') {
        this.transitionTo(TokenizerState.doctypeSystemIdentifierDoubleQuoted);
      } else if (char === "'") {
        this.transitionTo(TokenizerState.doctypeSystemIdentifierSingleQuoted);
      }
    },

    betweenDoctypePublicAndSystemIdentifiers() {
      let char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else if (char === '"') {
        this.transitionTo(TokenizerState.doctypeSystemIdentifierDoubleQuoted);
      } else if (char === "'") {
        this.transitionTo(TokenizerState.doctypeSystemIdentifierSingleQuoted);
      }
    },

    doctypeSystemIdentifierDoubleQuoted() {
      let char = this.consume();

      if (char === '"') {
        this.transitionTo(TokenizerState.afterDoctypeSystemIdentifier);
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        if (this.delegate.appendToDoctypeSystemIdentifier) this.delegate.appendToDoctypeSystemIdentifier(char);
      }
    },

    doctypeSystemIdentifierSingleQuoted() {
      let char = this.consume();

      if (char === "'") {
        this.transitionTo(TokenizerState.afterDoctypeSystemIdentifier);
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        if (this.delegate.appendToDoctypeSystemIdentifier) this.delegate.appendToDoctypeSystemIdentifier(char);
      }
    },

    afterDoctypeSystemIdentifier() {
      let char = this.consume();

      if (isSpace(char)) {
        return;
      } else if (char === '>') {
        if (this.delegate.endDoctype) this.delegate.endDoctype();
        this.transitionTo(TokenizerState.beforeData);
      }
    },

    commentStart() {
      let char = this.consume();

      if (char === '-') {
        this.transitionTo(TokenizerState.commentStartDash);
      } else if (char === '>') {
        this.delegate.finishComment();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.delegate.appendToCommentData(char);
        this.transitionTo(TokenizerState.comment);
      }
    },

    commentStartDash() {
      let char = this.consume();

      if (char === '-') {
        this.transitionTo(TokenizerState.commentEnd);
      } else if (char === '>') {
        this.delegate.finishComment();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.delegate.appendToCommentData('-');
        this.transitionTo(TokenizerState.comment);
      }
    },

    comment() {
      let char = this.consume();

      if (char === '-') {
        this.transitionTo(TokenizerState.commentEndDash);
      } else {
        this.delegate.appendToCommentData(char);
      }
    },

    commentEndDash() {
      let char = this.consume();

      if (char === '-') {
        this.transitionTo(TokenizerState.commentEnd);
      } else {
        this.delegate.appendToCommentData('-' + char);
        this.transitionTo(TokenizerState.comment);
      }
    },

    commentEnd() {
      let char = this.consume();

      if (char === '>') {
        this.delegate.finishComment();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.delegate.appendToCommentData('--' + char);
        this.transitionTo(TokenizerState.comment);
      }
    },

    tagName() {
      let char = this.consume();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.beforeAttributeName);
      } else if (char === '/') {
        this.transitionTo(TokenizerState.selfClosingStartTag);
      } else if (char === '>') {
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.appendToTagName(char);
      }
    },

    endTagName() {
      let char = this.consume();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.beforeAttributeName);
        this.tagNameBuffer = '';
      } else if (char === '/') {
        this.transitionTo(TokenizerState.selfClosingStartTag);
        this.tagNameBuffer = '';
      } else if (char === '>') {
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
        this.tagNameBuffer = '';
      } else {
        this.appendToTagName(char);
      }
    },

    beforeAttributeName() {
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
        return;
      } else if (char === '/') {
        this.transitionTo(TokenizerState.selfClosingStartTag);
        this.consume();
      } else if (char === '>') {
        this.consume();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else if (char === '=') {
        this.delegate.reportSyntaxError(
          'attribute name cannot start with equals sign'
        );
        this.transitionTo(TokenizerState.attributeName);
        this.delegate.beginAttribute();
        this.consume();
        this.delegate.appendToAttributeName(char);
      } else {
        this.transitionTo(TokenizerState.attributeName);
        this.delegate.beginAttribute();
      }
    },

    attributeName() {
      let char = this.peek();

      if (isSpace(char)) {
        this.transitionTo(TokenizerState.afterAttributeName);
        this.consume();
      } else if (char === '/') {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo(TokenizerState.selfClosingStartTag);
      } else if (char === '=') {
        this.transitionTo(TokenizerState.beforeAttributeValue);
        this.consume();
      } else if (char === '>') {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else if (char === '"' || char === "'" || char === '<') {
        this.delegate.reportSyntaxError(
          char + ' is not a valid character within attribute names'
        );
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
      } else if (char === '/') {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo(TokenizerState.selfClosingStartTag);
      } else if (char === '=') {
        this.consume();
        this.transitionTo(TokenizerState.beforeAttributeValue);
      } else if (char === '>') {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.transitionTo(TokenizerState.attributeName);
        this.delegate.beginAttribute();
        this.consume();
        this.delegate.appendToAttributeName(char);
      }
    },

    beforeAttributeValue() {
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
      } else if (char === '"') {
        this.transitionTo(TokenizerState.attributeValueDoubleQuoted);
        this.delegate.beginAttributeValue(true);
        this.consume();
      } else if (char === "'") {
        this.transitionTo(TokenizerState.attributeValueSingleQuoted);
        this.delegate.beginAttributeValue(true);
        this.consume();
      } else if (char === '>') {
        this.delegate.beginAttributeValue(false);
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.transitionTo(TokenizerState.attributeValueUnquoted);
        this.delegate.beginAttributeValue(false);
        this.consume();
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted() {
      let char = this.consume();

      if (char === '"') {
        this.delegate.finishAttributeValue();
        this.transitionTo(TokenizerState.afterAttributeValueQuoted);
      } else if (char === '&') {
        this.delegate.appendToAttributeValue(this.consumeCharRef() || '&');
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted() {
      let char = this.consume();

      if (char === "'") {
        this.delegate.finishAttributeValue();
        this.transitionTo(TokenizerState.afterAttributeValueQuoted);
      } else if (char === '&') {
        this.delegate.appendToAttributeValue(this.consumeCharRef() || '&');
      } else {
        this.delegate.appendToAttributeValue(char);
      }
    },

    attributeValueUnquoted() {
      let char = this.peek();

      if (isSpace(char)) {
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo(TokenizerState.beforeAttributeName);
      } else if (char === '/') {
        this.delegate.finishAttributeValue();
        this.consume();
        this.transitionTo(TokenizerState.selfClosingStartTag);
      } else if (char === '&') {
        this.consume();
        this.delegate.appendToAttributeValue(this.consumeCharRef() || '&');
      } else if (char === '>') {
        this.delegate.finishAttributeValue();
        this.consume();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.consume();
        this.delegate.appendToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted() {
      let char = this.peek();

      if (isSpace(char)) {
        this.consume();
        this.transitionTo(TokenizerState.beforeAttributeName);
      } else if (char === '/') {
        this.consume();
        this.transitionTo(TokenizerState.selfClosingStartTag);
      } else if (char === '>') {
        this.consume();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.transitionTo(TokenizerState.beforeAttributeName);
      }
    },

    selfClosingStartTag() {
      let char = this.peek();

      if (char === '>') {
        this.consume();
        this.delegate.markTagAsSelfClosing();
        this.delegate.finishTag();
        this.transitionTo(TokenizerState.beforeData);
      } else {
        this.transitionTo(TokenizerState.beforeAttributeName);
      }
    },

    endTagOpen() {
      let char = this.consume();

      if (char === '@' || char === ':' || isAlpha(char)) {
        this.transitionTo(TokenizerState.endTagName);
        this.tagNameBuffer = '';
        this.delegate.beginEndTag();
        this.appendToTagName(char);
      }
    }
  };
}

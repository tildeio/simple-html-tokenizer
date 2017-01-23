import { Option, opaque, unwrap, preprocessInput, isAlpha, isSpace } from "./utils";
import EntityParser from "./entity-parser";

function noop() {}

function wrapDelegate(tokenizer: EventedTokenizer, innerDelegate: DelegateOptions): Delegate {
  let events = [
    "reset", "whitespace",
    "beginData", "appendToData", "finishData",
    "beginComment", "appendToCommentData", "finishComment",
    "openStartTag", "openEndTag", "beginTagName", "appendToTagName", "finishTagName", "finishTag",
    "beginAttributeName", "appendToAttributeName", "finishAttributeName", "beginWholeAttributeValue", "beginAttributeValue", "appendToAttributeValue", "finishAttributeValue", "finishWholeAttributeValue", "voidAttributeValue",
  ];

  function Delegate() {
    let self: Delegate = this;

    events.forEach(function(event) {
      if (innerDelegate[event]) {
        self[event] = innerDelegate[event].bind(innerDelegate);
      } else {
        self[event] = noop;
      }
    });
  }

  return new (Delegate as any)() as Delegate;
}

export type Char = string | { chars: string, source: string };

export interface DelegateOptions {
  beginData?(pos: Position): void;
  appendToData?(pos: Position, char: Char): void;
  finishData?(pos: Position): void;
  finishAttributeName?(pos: Position): void;
  voidAttributeValue?(pos: Position): void;
  whitespace?(pos: Position, char: string): void;
  appendToCommentData?(pos: Position, char: string): void;
  openStartTag?(pos: Position): void;
  openEndTag?(pos: Position): void;
  beginTagName?(pos: Position): void;
  appendToTagName?(pos: Position, char: string): void;
  beginComment?(pos: Position): void;
  finishComment?(pos: Position): void;
  appendToCommentData?(pos: Position, char: string): void;
  finishTagName?(pos: Position): void;
  finishTag?(pos: Position, selfClosing: boolean): void;
  beginAttributeName?(pos: Position): void;
  appendToAttributeName?(pos: Position, char: string): void;
  beginWholeAttributeValue?(pos: Position): void;
  beginAttributeValue?(pos: Position, quoted: boolean): void;
  appendToAttributeValue?(pos: Position, char: Char): void;
  finishAttributeValue?(pos: Position, quoted: boolean): void;
  finishWholeAttributeValue?(pos: Position): void;
}

export interface Delegate extends DelegateOptions {
  beginData(pos: Position): void;
  appendToData(pos: Position, char: Char): void;
  finishData(pos: Position): void;
  finishAttributeName(pos: Position): void;
  voidAttributeValue(pos: Position): void;
  whitespace(pos: Position, char: string): void;
  appendToCommentData(pos: Position, char: string): void;
  openStartTag(pos: Position): void;
  openEndTag(pos: Position): void;
  beginTagName(pos: Position): void;
  appendToTagName(pos: Position, char: string): void;
  beginComment(pos: Position): void;
  finishComment(pos: Position): void;
  finishTagName(pos: Position): void;
  finishTag(pos: Position, selfClosing: boolean): void;
  beginAttributeName(pos: Position): void;
  appendToAttributeName(pos: Position, char: string): void;
  beginWholeAttributeValue(pos: Position): void;
  beginAttributeValue(pos: Position, quoted: boolean): void;
  appendToAttributeValue(pos: Position, char: Char): void;
  finishAttributeValue(pos: Position, quoted: boolean): void;
  finishWholeAttributeValue(pos: Position): void;
}

export interface Position {
  line: number;
  column: number;
}

export interface Location {
  start: Position;
  end: Position;
}

interface Marked {
  tagStart: Option<Position>;
  attrEnd: Option<Position>;
  commentEnd: Option<Position>;
  slash: Option<Position>;
  charRef: Option<Position>;
}

export default class EventedTokenizer {
  public state: State;

  public index = 0;
  public tagLine: Option<number> = null;
  public tagColumn: Option<number> = null;
  public bufferedWhitespace: [Position, string][] = [];
  public bufferedData: [Position, string][] = [];
  public delegate: Delegate;
  public line = 1;
  public column = 0;

  public marked: Marked = {
    tagStart: null,
    attrEnd: null,
    commentEnd: null,
    slash: null,
    charRef: null
  };

  constructor(delegate: DelegateOptions, public entityParser: EntityParser, public input: string = "") {
    this.delegate = wrapDelegate(this, delegate);
    this.entityParser = entityParser;
    this.state = BeforeData;
  }

  tokenize(input: string) {
    this.tokenizePart(input);
    this.tokenizeEOF();
  }

  tokenizePart(input: string) {
    this.input += preprocessInput(input);

    while (this.index < this.input.length) {
      this.state.process(this);
    }
  }

  tokenizeEOF() {
    this.flushData();
  }

  flushData() {
    if (this.state === Data) {
      this.delegate.finishData(this);
      this.state = BeforeData;
    }
  }

  voidAttributeValue() {
    this.delegate.finishAttributeName(unwrap(this.marked.attrEnd));
    this.delegate.voidAttributeValue(unwrap(this.marked.attrEnd));
    this.flushWhitespace();
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

  consumeCharRef(char: string): { loc: Position, char: string | { chars: string, source: string } } {
    this.markCharRef();
    this.consume();

    let endIndex = this.input.indexOf(";", this.index);
    if (endIndex === -1) {
      return { loc: unwrap(this.marked.charRef), char: "&" };
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

      return {
        loc: unwrap(this.marked.charRef),
        char: { chars: chars, source: "&" + entity + ";" }
      };
    }

    return { loc: unwrap(this.marked.charRef), char: "&" };
  }

  markTagStart() {
    this.marked.tagStart = this.pos();
  }

  markAttributeEnd() {
    this.marked.attrEnd = this.pos();
  }

  markSlash() {
    this.marked.slash = this.pos();
  }

  markCommentEnd() {
    this.marked.commentEnd = this.pos();
  }

  markCharRef() {
    this.marked.charRef = this.pos();
  }

  bufferWhitespace(char: string) {
    this.bufferedWhitespace.push([this.pos(), char]);
  }

  flushWhitespace() {
    let delegate = this.delegate;

    this.bufferedWhitespace.forEach(function(ws) {
      delegate.whitespace(ws[0], ws[1]);
    });

    this.bufferedWhitespace = [];
  }

  flushCommentData() {
    let delegate = this.delegate;

    this.bufferedWhitespace.forEach(function(ws) {
      delegate.appendToCommentData(ws[0], ws[1]);
    });

    this.bufferedWhitespace = [];
  }

  pos() {
    return { line: this.line, column: this.column };
  }

  lastPos() {
    if (this.column === 0) throw new Error("BUG: Can't get the last position at column 0");
    return { line: this.line, column: this.column - 1 };
  }
}

interface State {
  process(t: EventedTokenizer): void;
}

const BeforeData: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "<") {
      t.state = TagOpen;
      t.markTagStart();
      t.consume();
    } else {
      t.state = Data;
      t.delegate.beginData(t);
    }
  }
};

const Data: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "<") {
      t.delegate.finishData(t);
      t.state = TagOpen;
      t.markTagStart();
      t.consume(); 
    } else if (char === "&") {
      let ref = t.consumeCharRef("");
      t.delegate.appendToData(ref.loc, ref.char);
    } else {
      t.delegate.appendToData(t, char);
      t.consume();
    }
  }
};

const TagOpen: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "!") {
      t.state = MarkupDeclaration;
      t.consume();
    } else if (char === "/") {
      t.state = EndTagOpen;
      t.consume();
    } else if (isAlpha(char)) {
      t.state = TagName;
      t.delegate.openStartTag(unwrap(t.marked.tagStart));
      t.delegate.beginTagName(t);
      t.delegate.appendToTagName(t, char.toLowerCase());
      t.consume();
    }
  }
};

const MarkupDeclaration: State = {
  process(t: EventedTokenizer) {
    let char = t.consume();

    if (char === "-" && t.input.charAt(t.index) === "-") {
      t.state = CommentStart;
      t.delegate.beginComment(unwrap(t.marked.tagStart));
      t.consume();
    }
  }
};

const CommentStart: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "-") {
      t.bufferWhitespace(char);
      t.consume();
      t.state = CommentStartDash;
    } else if (char === ">") {
      t.consume();
      t.delegate.finishComment(t);
      t.state = BeforeData;
    } else {
      t.delegate.appendToCommentData(t, char);
      t.consume();
      t.state = Comment;
    }
  }
};

const CommentStartDash: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "-") {
      t.bufferWhitespace(char);
      t.consume();
      t.state = CommentEnd;
    } else if (char === ">") {
      t.flushWhitespace();
      t.consume();
      t.delegate.finishComment(t);
      t.state = BeforeData;
    } else {
      t.flushCommentData();
      t.delegate.appendToCommentData(t, char);
      t.consume();
      t.state = Comment;
    }
  }
};

const Comment: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "-") {
      t.bufferWhitespace(char);
      t.consume();
      t.state = CommentEndDash;
    } else {
      t.delegate.appendToCommentData(t, char);
      t.consume();
    }
  }
};

const CommentEndDash: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "-") {
      t.bufferWhitespace(char);
      t.consume();
      t.state = CommentEnd;
    } else {
      t.flushCommentData();
      t.delegate.appendToCommentData(t, char);
      t.consume();
      t.state = Comment;
    }
  }
};

const CommentEnd: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === ">") {
      t.flushWhitespace();
      t.consume();
      t.delegate.finishComment(t);
      t.state = BeforeData;
    } else {
      t.flushCommentData();
      t.delegate.appendToCommentData(t, char);
      t.consume();
      t.state = Comment;
    }
  }
};

const TagName: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.delegate.finishTagName(t);
      t.delegate.whitespace(t, char);
      t.consume();
      t.state = BeforeAttributeName;
    } else if (char === "/") {
      t.delegate.finishTagName(t);
      t.consume();
      t.state = SelfClosingStartTag;
    } else if (char === ">") {
      t.delegate.finishTagName(t);
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.delegate.appendToTagName(t, char);
      t.consume();
    }
  }
};

const BeforeAttributeName: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.delegate.whitespace(t, char);
      t.consume();
      return;
    } else if (char === "/") {
      t.consume();
      t.state = SelfClosingStartTag;
    } else if (char === ">") {
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.state = AttributeName;
      t.delegate.beginAttributeName(t);
      t.delegate.appendToAttributeName(t, char);
      t.consume();
    }
  }
};

const AttributeName: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.markAttributeEnd();
      t.bufferWhitespace(char);
      t.consume();
      t.state = AfterAttributeName;
    } else if (char === "/") {
      t.markAttributeEnd();
      t.voidAttributeValue();
      t.consume();
      t.state = SelfClosingStartTag;
    } else if (char === "=") {
      t.delegate.finishAttributeName(t);
      t.delegate.whitespace(t, char);
      t.consume();
      t.state = BeforeAttributeValue;
    } else if (char === ">") {
      t.markAttributeEnd();
      t.voidAttributeValue();
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.delegate.appendToAttributeName(t, char);
      t.consume();
    }
  }
};

const AfterAttributeName: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.markAttributeEnd();
      t.delegate.whitespace(t, char);
      t.consume();
      return;
    } else if (char === "/") {
      t.voidAttributeValue();
      t.consume();
      t.state = SelfClosingStartTag;
    } else if (char === "=") {
      t.delegate.whitespace(t, char);
      t.consume();
      t.state = BeforeAttributeValue;
    } else if (char === ">") {
      t.voidAttributeValue();
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.voidAttributeValue();
      t.state = AttributeName;
      t.delegate.beginAttributeName(t);
      t.delegate.appendToAttributeName(t, char);
      t.consume();
    }
  }
};

const BeforeAttributeValue: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.delegate.whitespace(t, char);
      t.consume();
    } else if (char === `"`) {
      t.state = AttributeValueDoubleQuoted;
      t.delegate.beginWholeAttributeValue(t);
      t.delegate.whitespace(t, char);
      t.consume();
      t.delegate.beginAttributeValue(t, true);
    } else if (char === "'") {
      t.state = AttributeValueSingleQuoted;
      t.delegate.beginWholeAttributeValue(t);
      t.delegate.whitespace(t, char);
      t.consume();
      t.delegate.beginAttributeValue(t, true);
    } else if (char === ">") {
      t.voidAttributeValue();
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.state = AttributeValueUnquoted;
      t.delegate.beginWholeAttributeValue(t);
      t.delegate.beginAttributeValue(t, false);
      t.delegate.appendToAttributeValue(t, char);
      t.consume();
    }
  }
};

const AttributeValueDoubleQuoted: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === `"`) {
      t.delegate.finishAttributeValue(t, true);
      t.delegate.whitespace(t, char);
      t.consume();
      t.delegate.finishWholeAttributeValue(t);
      t.state = AfterAttributeValueQuoted;
    } else if (char === "&") {
      let ref = t.consumeCharRef("");
      t.delegate.appendToAttributeValue(ref.loc, ref.char);
    } else {
      t.delegate.appendToAttributeValue(t, char);
      t.consume();
    }
  }
};

const AttributeValueSingleQuoted: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === "'") {
      t.delegate.finishAttributeValue(t, true);
      t.delegate.whitespace(t, char);
      t.consume();
      t.delegate.finishWholeAttributeValue(t);
      t.state = AfterAttributeValueQuoted;
    } else if (char === "&") {
      let ref = t.consumeCharRef("'");
      t.delegate.appendToAttributeValue(ref.loc, ref.char);
    } else {
      t.delegate.appendToAttributeValue(t, char);
      t.consume();
    }
  }
};

const AttributeValueUnquoted: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.delegate.finishAttributeValue(t, false);
      t.delegate.finishWholeAttributeValue(t);
      t.delegate.whitespace(t, char);
      t.consume();
      t.state = BeforeAttributeName;
    } else if (char === "&") {
      let ref = t.consumeCharRef(">");
      t.delegate.appendToAttributeValue(ref.loc, ref.char);
      t.consume();
    } else if (char === ">") {
      t.delegate.finishAttributeValue(t, false);
      t.delegate.finishWholeAttributeValue(t);
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.delegate.appendToAttributeValue(t, char);
      t.consume();
    }
  }
};

const AfterAttributeValueQuoted: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isSpace(char)) {
      t.delegate.whitespace(t, char);
      t.consume();
      t.state = BeforeAttributeName;
    } else if (char === "/") {
      t.consume();
      t.state = SelfClosingStartTag;
    } else if (char === ">") {
      t.consume();
      t.delegate.finishTag(t, false);
      t.state = BeforeData;
    } else {
      t.state = BeforeAttributeName;
    }
  }
};

const SelfClosingStartTag: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (char === ">") {
      t.consume();
      t.delegate.finishTag(t, true);
      t.state = BeforeData;
    } else {
      t.delegate.whitespace(t.lastPos(), "/");
      t.state = BeforeAttributeName;
    }
  }
};

const EndTagOpen: State = {
  process(t: EventedTokenizer) {
    let char = t.peek();

    if (isAlpha(char)) {
      t.state = TagName;
      t.delegate.openEndTag(unwrap(t.marked.tagStart));
      t.delegate.beginTagName(t);
      t.delegate.appendToTagName(t, char.toLowerCase());
      t.consume();
    }
  }
};

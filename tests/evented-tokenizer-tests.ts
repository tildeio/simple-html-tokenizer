import { EventedTokenizer, EntityParser, HTML5NamedCharRefs } from 'simple-html-tokenizer';

var eventNames = [
  'reset', 'whitespace',
  'beginData', 'appendToData', 'finishData',
  'beginComment', 'appendToCommentData', 'finishComment',
  'openTag', 'beginTagName', 'appendToTagName', 'finishTagName', 'finishTag',
  'beginAttributeName', 'appendToAttributeName', 'finishAttributeName', 'beginWholeAttributeValue', 'beginAttributeValue', 'appendToAttributeValue', 'finishAttributeValue', 'finishWholeAttributeValue', 'voidAttributeValue',
];

interface Dict<T> {
  [key: string]: T;
}

interface Position {
  line: number;
  column: number;
}

interface Location {
  start: Position;
  end: Position;
}

type Char = string | { chars: string, source: string };
type SimpleEvent = [string] | [string, Position];
type Event<T> = SimpleEvent | [string, Position, T]

type opaque = {} | void;

var delegate: Dict<any> = {};
let events: Event<opaque>[], e: Events;

eventNames.forEach(function(event) {
  delegate[event] = function<T>(pos: Position, data: T) {
    let e: Event<T>;

    if (arguments.length > 1) {
      e = [event, { line: pos.line, column: pos.column }, data];
    } else if (arguments.length > 0) {
      e = [event, { line: pos.line, column: pos.column }];
    } else {
      e = [event];
    }

    events.push(e);
  }
});

function setup() {
  events = [];
  e = new Events();
}

function tokenize(input: string) {
  var tokenizer = new EventedTokenizer(
    delegate,
    new EntityParser(HTML5NamedCharRefs)
  );

  tokenizer.tokenize(input);
}

abstract class EventGroup {
  protected events: Event<opaque>[] = [];

  add(event: Event<opaque>) {
    this.events.push(event);
  }

  toEvents(): Event<opaque>[] {
    return this.events;
  }
}

class Data extends EventGroup {
  constructor(chars: string) {
    super();

    this.add(e.beginData());

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToData(chars[i]))
    }

    this.add(e.finishData());
  }
}

class DataChars extends EventGroup {
  constructor(chars: string) {
    super();

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToData(chars[i]))
    }
  }
}

class DataEntity extends EventGroup {
  constructor(entity: string, source: string) {
    super();

    this.add(e.appendToData({ chars: entity, source: source }));
  }
}

class Comment extends EventGroup {
  constructor(chars: string, close: string = '--') {
    super();
    this.add(e.beginComment());

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToCommentData(chars[i]))
    }

    for (let i=0; i<close.length; i++) {
      this.add(e.whitespace(close[i]));
    }

    this.add(e.finishComment());
  }
}

class CommentChars extends EventGroup {
  constructor(chars: string) {
    super();
    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToCommentData(chars[i]))
    }
  }
}

class CommentEntity extends EventGroup {
  constructor(entity: string, source: string) {
    super();
    this.add(e.appendToCommentData({ chars: entity, source: source }));
  }
}

class TagName extends EventGroup {
  constructor(chars: string) {
    super();

    this.add(e.beginTagName());

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToTagName(chars[i]))
    }

    this.add(e.finishTagName());
  }
}

class AttributeName extends EventGroup {
  constructor(chars: string) {
    super();

    this.add(e.beginAttributeName());

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToAttributeName(chars[i]))
    }

    this.add(e.finishAttributeName());
  }
}

class StartAttributeValue extends EventGroup {
  constructor(quote: string) {
    super();
    
    this.add(e.beginWholeAttributeValue());

    if (quote) this.add(e.whitespace(quote));
    this.add(e.beginAttributeValue(!!quote));
  }
}

class FinishAttributeValue extends EventGroup {
  constructor(quote: string) {
    super();

    this.add(e.finishAttributeValue(!!quote));

    if (quote) this.add(e.whitespace(quote));
    this.add(e.finishWholeAttributeValue());
  }
}

class AttributeValue extends EventGroup {
  constructor(chars: string, quote: string) {
    super();

    this.add(e.beginWholeAttributeValue());
    if (quote) this.add(e.whitespace(quote));
    this.add(e.beginAttributeValue(!!quote));

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToAttributeValue(chars[i]))
    }

    this.add(e.finishAttributeValue(!!quote));
    if (quote) this.add(e.whitespace(quote));
    this.add(e.finishWholeAttributeValue());  
  }
}

class AttributeValueChars extends EventGroup {
  constructor(chars: string) {
    super();

    for (var i=0; i<chars.length; i++) {
      this.add(e.appendToAttributeValue(chars[i]))
    }
  }
}

class AttributeValueEntity extends EventGroup {
  constructor(entity: string, source: string) {
    super();
    this.add(e.appendToAttributeValue({ chars: entity, source: source }));
  }
}

class Whitespace extends EventGroup {
  constructor(chars: string) {
    super();
    
    for (var i=0; i<chars.length; i++) {
      this.add(e.whitespace(chars[i]))
    }
  }
}

class Events {
  column = 0;
  line = 1;

  advance(char: Char): Position {
    let pos = this.pos();

    if (typeof char !== 'string') {
      this.advance(char.chars);
    } else if (char === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }

    return pos;
  }

  skip(count: number): Position {
    let pos = this.pos();
    this.column += count;
    return pos;
  }

  pos() {
    return { line: this.line, column: this.column };
  }

  reset() {
    return ['reset'];
  }

  whitespace(char: string): Event<string> {
    return ['whitespace', this.advance(char), char];
  }

  beginData(): SimpleEvent {
    return ['beginData', this.pos()];
  }

  appendToData(char: Char): Event<Char> {
    if (typeof char === 'string') {
      return ['appendToData', this.advance(char), char];
    } else {
      return ['appendToData', this.skip(char.source.length), char];
    }
  }

  finishData(): SimpleEvent {
    return ['finishData', this.pos()];
  }

  beginComment(): SimpleEvent {
    let pos = this.advance('<');
    this.advance('!');
    this.advance('-');
    this.advance('-');
    return ['beginComment', pos];
  }

  appendToCommentData(char: Char): Event<Char> {
    return ['appendToCommentData', this.advance(char), char];
  }

  finishComment(): SimpleEvent {
    this.advance('>');
    return ['finishComment', this.pos()];
  }

  openTag(kind: 'start' | 'end'): Event<'start' | 'end'> {
    let pos = this.advance('<');
    if (kind === 'end') this.advance('/');
    return ['openTag', pos, kind];
  }

  beginTagName(): SimpleEvent {
    return ['beginTagName', this.pos()];
  }

  appendToTagName(char: string): Event<string> {
    return ['appendToTagName', this.advance(char), char];
  }

  finishTagName(): SimpleEvent {
    return ['finishTagName', this.pos()];
  }

  finishTag(selfClosing: boolean = false): Event<Boolean> {
    if (selfClosing) this.advance('/');
    this.advance('>');
    return ['finishTag', this.pos(), selfClosing];
  }

  beginAttributeName(): SimpleEvent {
    return ['beginAttributeName', this.pos()];
  }

  appendToAttributeName(char: Char): Event<Char> {
    if (typeof char === 'string') {
      return ['appendToAttributeName', this.advance(char), char];
    } else {
      return ['appendToAttributeName', this.skip(char.source.length), char];
    }
  }

  finishAttributeName(): SimpleEvent {
    return ['finishAttributeName', this.pos()];
  }

  beginWholeAttributeValue(): SimpleEvent {
    return ['beginWholeAttributeValue', this.pos()];
  }

  beginAttributeValue(quoted: boolean): Event<boolean> {
    return ['beginAttributeValue', this.pos(), quoted];
  }

  appendToAttributeValue(char: Char): Event<Char> {
    if (typeof char === 'string') {
      return ['appendToAttributeValue', this.advance(char), char];
    } else {
      return ['appendToAttributeValue', this.skip(char.source.length), char];
    }
  }

  finishAttributeValue(quoted: boolean): Event<boolean> {
    return ['finishAttributeValue', this.pos(), quoted];
  }

  finishWholeAttributeValue(): SimpleEvent {
    return ['finishWholeAttributeValue', this.pos()];
  }

  voidAttributeValue(): SimpleEvent {
    return ['voidAttributeValue', this.pos()];
  }
}

function format(event: Event<Char>) {
  let f = event[0];

  if (event.length > 1) {
    f += ": " + (event[1] as Position).column + ":" + (event[1] as Position).line;
  }

  if (event[2]) {
    f += " (" + formatData(event[2] as Char) + ")";
  }

  return f;
}

function formatData(data: Char) {
  if (typeof data === 'object' && data.chars && data.source) {
    return data.chars + " as  " + data.source;
  } else if (typeof data === 'object') {
    throw new Error("Unexpected event data: " + JSON.stringify(data));
  } else {
    return data;
  }
}

QUnit.assert.events = function(_expected: (Event<opaque> | EventGroup)[], message?: string) {
  var expected: Event<opaque>[] = [];

  _expected.forEach(function(e) {
    if (e instanceof EventGroup) {
      expected = expected.concat(e.toEvents());
    } else {
      expected.push(e);
    }
  });

  var expectedStrings = expected.map(format);

  var actualStrings = events.map(format);

  QUnit.push(QUnit.equiv(actualStrings, expectedStrings), actualStrings, expectedStrings, message);
}

QUnit.module("simple-html-tokenizer - EventedTokenizer", {
  setup: setup
});

QUnit.test("Simple content", assert => {
  tokenize("hello");

  assert.events([
    new Data("hello")
  ]);
});

QUnit.test("A simple tag", function(assert) {
  tokenize("<div>");

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    e.finishTag()
  ]);
});

QUnit.test("A simple tag with trailing spaces", function(assert) {
  tokenize("<div   \t\n>");

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace('   \t\n'),
    e.finishTag()
  ]);
});

QUnit.test("A simple closing tag", function(assert) {
  tokenize("</div>");

  assert.events([
    e.openTag('end'),
    new TagName('div'),
    e.finishTag()
  ]);
});

QUnit.test("A simple closing tag with trailing spaces", function(assert) {
  tokenize("</div   \t\n>");

  assert.events([
    e.openTag('end'),
    new TagName('div'),
    new Whitespace('   \t\n'),
    e.finishTag()
  ]);
});

QUnit.test("A pair of hyphenated tags", function(assert) {
  tokenize("<x-foo></x-foo>");

  assert.events([
    e.openTag('start'),
    new TagName('x-foo'),
    e.finishTag(),
    e.openTag('end'),
    new TagName('x-foo'),
    e.finishTag()    
  ]);
});

QUnit.test("A tag with a single-quoted attribute", function(assert) {
  tokenize("<div id='foo'>");

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('id'),
    new Whitespace('='),
    new AttributeValue('foo', "'"),
    e.finishTag()
  ]);
});

QUnit.test("A tag with a double-quoted attribute", function(assert) {
  tokenize('<div id="foo">');

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('id'),
    new Whitespace('='),
    new AttributeValue('foo', '"'),
    e.finishTag()
  ]);
});

QUnit.test("A tag with a double-quoted empty", function(assert) {
  tokenize('<div id="">');

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('id'),
    new Whitespace('='),
    new AttributeValue('', '"'),
    e.finishTag()
  ]);
});

QUnit.test("A tag with unquoted attribute", function(assert) {
  tokenize('<div id=foo>');

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('id'),
    new Whitespace('='),
    new AttributeValue('foo', null),
    e.finishTag()
  ]);
});

QUnit.test("A tag with valueless attributes", function(assert) {
  tokenize('<div foo bar>');

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('foo'),
    e.voidAttributeValue(),
    new Whitespace(' '),
    new AttributeName('bar'),
    e.voidAttributeValue(),
    e.finishTag()
  ]);
});

QUnit.test("A tag with multiple attributes", function(assert) {
  tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  
  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('id'),
    new Whitespace('='),
    new AttributeValue('foo', null),
    new Whitespace(' '),
    new AttributeName('class'),
    new Whitespace('='),
    new AttributeValue('bar baz', '"'),
    new Whitespace(' '),
    new AttributeName('href'),
    new Whitespace('='),
    new AttributeValue('bat', "'"),
    e.finishTag()    
  ]);
});

QUnit.test("A tag with capitalization in attributes", function(assert) {
  tokenize('<svg viewBox="0 0 0 0">');

  assert.events([
    e.openTag('start'),
    new TagName('svg'),
    new Whitespace(' '),
    new AttributeName('viewBox'),
    new Whitespace('='),
    new AttributeValue('0 0 0 0', '"'),
    e.finishTag()
  ]);
});

QUnit.test("A tag with capitalization in the tag", function(assert) {
  tokenize('<linearGradient>');

  assert.events([
    e.openTag('start'),
    new TagName('linearGradient'),
    e.finishTag()
  ]);
});

QUnit.test("A self-closing tag", function(assert) {
  tokenize('<img />');

  assert.events([
    e.openTag('start'),
    new TagName('img'),
    new Whitespace(' '),
    e.finishTag(true)
  ]);
});

QUnit.test("A self-closing tag with valueless attributes (regression)", function(assert) {
  tokenize('<input disabled />');

  assert.events([
    e.openTag('start'),
    new TagName('input'),
    new Whitespace(' '),
    new AttributeName('disabled'),
    e.voidAttributeValue(),
    new Whitespace(' '),
    e.finishTag(true)
  ]);
});

QUnit.test("A self-closing tag with valueless attributes without space before closing (regression)", function(assert) {
  tokenize('<input disabled/>');

  assert.events([
    e.openTag('start'),
    new TagName('input'),
    new Whitespace(' '),
    new AttributeName('disabled'),
    e.voidAttributeValue(),
    e.finishTag(true)
  ]);
});

QUnit.test("A tag with a / in the middle", function(assert) {
  tokenize('<img / src="foo.png">');

  assert.events([
    e.openTag('start'),
    new TagName('img'),
    new Whitespace(' / '),
    new AttributeName('src'),
    new Whitespace('='),
    new AttributeValue('foo.png', '"'),
    e.finishTag()
  ]);
});

QUnit.test("An opening and closing tag with some content", function(assert) {
  tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('id'),
    new Whitespace('='),
    new AttributeValue('foo', "'"),
    new Whitespace(' '),
    new AttributeName('class'),
    new Whitespace('='),
    new AttributeValue('{{bar}} baz', "'"),
    e.finishTag(),
    new Data('Some content'),
    e.openTag('end'),
    new TagName('div'),
    e.finishTag()
  ]);
});

QUnit.test("A comment", function(assert) {
  tokenize("<!-- hello -->");

  assert.events([
    new Comment(' hello ')
  ]);
});

QUnit.test("A (buggy) comment with no ending --", function(assert) {
  tokenize("<!-->");

  assert.events([
    new Comment('', '')
  ]);
});

QUnit.test("A comment that immediately closes", function(assert) {
  tokenize("<!---->");

  assert.events([
    new Comment('')
  ]);
});

QUnit.test("A comment that contains a -", function(assert) {
  tokenize("<!-- A perfectly legal - appears -->");

  assert.events([
    new Comment(' A perfectly legal - appears ')
  ]);
});

QUnit.test("A (buggy) comment that contains two --", function(assert) {
  tokenize("<!-- A questionable -- appears -->");

  assert.events([
    new Comment(' A questionable -- appears ')
  ]);
});

QUnit.test("Character references are expanded", function(assert) {
  tokenize("&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;");

  debugger;
  var Entity = DataEntity;

  assert.events([
    e.beginData(),
    new Entity('"', "&quot;"),
    new DataChars('Foo '),
    new Entity('&', "&amp;"),
    new DataChars(' Bar'),
    new Entity('"', "&quot;"),
    new DataChars(' '),
    new Entity('<', "&lt;"),
    new DataChars(' '),
    new Entity('<', "&#60;"),
    new Entity('<', "&#x3c;"),
    new DataChars(' '),
    new Entity('<', "&#x3C;"),
    new DataChars(' '),
    new Entity('<', "&LT;"),
    new DataChars(' '),
    new Entity('≧̸', "&NotGreaterFullEqual;"),
    new DataChars(' &Borksnorlax; '),
    new Entity('≦̸', '&nleqq;'),
    e.finishData()
  ]);
});

QUnit.test("Character refs in attributes", function(assert) {
  tokenize("<div title='&quot;Foo &amp; Bar&quot; &blk12; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>");

  var Entity = AttributeValueEntity;
  var Chars = AttributeValueChars;

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('title'),
    new Whitespace('='),
    new StartAttributeValue("'"),
    new Entity('"', "&quot;"),
    new Chars('Foo '),
    new Entity('&', "&amp;"),
    new Chars(' Bar'),
    new Entity('"', "&quot;"),
    new Chars(' '),
    new Entity('▒', "&blk12;"),
    new Chars(' '),
    new Entity('<', "&lt;"),
    new Chars(' '),
    new Entity('<', "&#60;"),
    new Entity('<', "&#x3c;"),
    new Chars(' '),
    new Entity('<', "&#x3C;"),
    new Chars(' '),
    new Entity('<', "&LT;"),
    new Chars(' '),
    new Entity('≧̸', "&NotGreaterFullEqual;"),
    new Chars(' &Borksnorlax; '),
    new Entity('≦̸', '&nleqq;'),
    new FinishAttributeValue("'"),
    e.finishTag()
  ]);
});

QUnit.module("simple-html-tokenizer - EventedTokenizer - preprocessing", {
  setup: setup
});

QUnit.test("Carriage returns are replaced with line feeds", function(assert) {
  tokenize("\r\r\n\r\r\n\n");

  assert.events([
    e.beginData(),
    new DataChars("\n\n\n\n\n"),
    e.finishData()
  ]);
});

QUnit.module("simple-html-tokenizer - EventedTokenizer - location info", {
  setup: setup
});

QUnit.test("tokens: Chars start-tag Chars", function(assert) {
  tokenize("Chars<div>Chars");

  assert.events([
    e.beginData(),
    new DataChars("Chars"),
    e.finishData(),
    e.openTag('start'),
    new TagName('div'),
    e.finishTag(),
    e.beginData(),
    new DataChars("Chars"),
    e.finishData()
  ]);
});

QUnit.test("tokens: start-tag start-tag", function(assert) {
  tokenize("<div><div>");

  assert.events([
    e.openTag('start'),
    new TagName('div'),
    e.finishTag(),
    e.openTag('start'),
    new TagName('div'),
    e.finishTag(),
  ]);
});

QUnit.test("tokens: html char ref start-tag", function(assert) {
  tokenize("&gt;<div>");

  assert.events([
    e.beginData(),
    new DataEntity('>', '&gt;'),
    e.finishData(),
    e.openTag('start'),
    new TagName('div'),
    e.finishTag()
  ]);
});

QUnit.test("tokens: Chars start-tag Chars start-tag", function(assert) {
  tokenize("Chars\n<div>Chars\n<div>");

  assert.events([
    e.beginData(),
    new DataChars('Chars\n'),
    e.finishData(),
    e.openTag('start'),
    new TagName('div'),
    e.finishTag(),
    e.beginData(),
    new DataChars('Chars\n'),
    e.finishData(),    
    e.openTag('start'),
    new TagName('div'),
    e.finishTag()
  ]);
});

QUnit.test("tokens: comment start-tag Chars end-tag", function(assert) {
  tokenize("<!-- multline\ncomment --><div foo=bar>Chars\n</div>");

  assert.events([
    new Comment(' multline\ncomment '),
    e.openTag('start'),
    new TagName('div'),
    new Whitespace(' '),
    new AttributeName('foo'),
    new Whitespace('='),
    new AttributeValue('bar', null),
    e.finishTag(),
    new Data('Chars\n'),
    e.openTag('end'),
    new TagName('div'),
    e.finishTag()
  ]);
});

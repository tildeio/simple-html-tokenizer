/* global HTML5Tokenizer: false */

var eventNames = [
  'reset', 'whitespace',
  'beginData', 'appendToData', 'finishData',
  'beginComment', 'appendToCommentData', 'finishComment',
  'openTag', 'beginTagName', 'appendToTagName', 'finishTagName', 'finishTag',
  'beginAttributeName', 'appendToAttributeName', 'finishAttributeName', 'beginWholeAttributeValue', 'beginAttributeValue', 'appendToAttributeValue', 'finishAttributeValue', 'finishWholeAttributeValue', 'voidAttributeValue',
];

var delegate = {};
var events;

eventNames.forEach(function(event) {
  delegate[event] = function(pos, data) {
    let e = [event];

    if (arguments.length > 0) {
      e.push({ line: pos.line, column: pos.column });
    }

    if (arguments.length > 1) {
      e.push(data);
    }

    events.push(e);
  }
});

function setup() {
  events = [];
  e = new Events();
}

function tokenize(input) {
  var tokenizer = new HTML5Tokenizer.EventedTokenizer(
    delegate,
    new HTML5Tokenizer.EntityParser(HTML5Tokenizer.HTML5NamedCharRefs)
  );

  tokenizer.tokenize(input);
}

function EventClass(constructor) {
  constructor.prototype.toEvents = function() {
    return this.events;
  };

  return constructor;
}

var Data = EventClass(function(chars) {
  var events = [];
  events.push(e.beginData());

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToData(chars[i]))
  }

  events.push(e.finishData());

  this.events = events;
});

var DataChars = EventClass(function(chars) {
  var events = [];

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToData(chars[i]))
  }

  this.events = events;
});

var DataEntity = EventClass(function(entity, source) {
  this.events = [
    e.appendToData({ chars: entity, source: source })
  ];
});

var Comment = EventClass(function(chars, close) {
  var events = [];
  events.push(e.beginComment());

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToCommentData(chars[i]))
  }

  if (arguments.length === 1) {
    close = '--';
  }

  for (let i=0; i<close.length; i++) {
    events.push(e.whitespace(close[i]));
  }

  events.push(e.finishComment());

  this.events = events;
});

var CommentChars = EventClass(function(chars) {
  var events = [];

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToCommentData(chars[i]))
  }

  this.events = events;
});

var CommentEntity = EventClass(function(entity, source) {
  this.events = [
    e.appendToCommentData({ chars: entity, source: source })
  ];
});

var TagName = EventClass(function(chars) {
  var events = [];

  events.push(e.beginTagName());

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToTagName(chars[i]))
  }

  events.push(e.finishTagName());

  this.events = events;
});

var AttributeName = EventClass(function(chars) {
  var events = [];

  events.push(e.beginAttributeName());

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToAttributeName(chars[i]))
  }

  events.push(e.finishAttributeName());

  this.events = events;
});

var StartAttributeValue = EventClass(function(quote) {
  var events = [
    e.beginWholeAttributeValue()
  ];

  if (quote) events.push(e.whitespace(quote));
  events.push(e.beginAttributeValue(!!quote));

  this.events = events;
});

var FinishAttributeValue = EventClass(function(quote) {
  var events = [
    e.finishAttributeValue(!!quote)
  ];

  if (quote) events.push(e.whitespace(quote));
  events.push(e.finishWholeAttributeValue());

  this.events = events;
});

var AttributeValue = EventClass(function(chars, quote) {
  var events = [];

  events.push(e.beginWholeAttributeValue());
  if (quote) events.push(e.whitespace(quote));
  events.push(e.beginAttributeValue(!!quote));

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToAttributeValue(chars[i]))
  }

  events.push(e.finishAttributeValue(!!quote));
  if (quote) events.push(e.whitespace(quote));
  events.push(e.finishWholeAttributeValue());  

  this.events = events;
});

var AttributeValueChars = EventClass(function(chars) {
  var events = [];

  for (var i=0; i<chars.length; i++) {
    events.push(e.appendToAttributeValue(chars[i]))
  }

  this.events = events;
});

var AttributeValueEntity = EventClass(function(entity, source) {
  this.events = [
    e.appendToAttributeValue({ chars: entity, source: source })
  ];
});

var Whitespace = EventClass(function(chars) {
  var events = [];

  for (var i=0; i<chars.length; i++) {
    events.push(e.whitespace(chars[i]))
  }

  this.events = events;
});

function Events() {
  this.column = 0;
  this.line = 1;
}

Events.prototype = {
  advance: function(char) {
    let pos = this.pos();

    if (char === '\n') {
      this.line++;
      this.column = 0;
    } else {
      this.column++;
    }

    return pos;
  },

  skip: function(count) {
    let pos = this.pos();
    this.column += count;
    return pos;
  },

  pos: function() {
    return { line: this.line, column: this.column };
  },

  reset: function() {
    return ['reset'];
  },

  whitespace: function(char) {
    return ['whitespace', this.advance(char), char];
  },

  beginData: function() {
    return ['beginData', this.pos()];
  },

  appendToData: function(char) {
    if (typeof char === 'string') {
      return ['appendToData', this.advance(char), char];
    } else {
      return ['appendToData', this.skip(char.source.length), char];
    }
  },

  finishData: function() {
    return ['finishData', this.pos()];
  },

  beginComment: function() {
    let pos = this.advance('<');
    this.advance('!');
    this.advance('-');
    this.advance('-');
    return ['beginComment', pos];
  },

  appendToCommentData: function(char) {
    return ['appendToCommentData', this.advance(char), char];
  },

  finishComment: function() {
    this.advance('>');
    return ['finishComment', this.pos()];
  },

  openTag: function(kind) {
    let pos = this.advance('<');
    if (kind === 'end') this.advance('/');
    return ['openTag', pos, kind];
  },

  beginTagName: function() {
    return ['beginTagName', this.pos()];
  },

  appendToTagName: function(char) {
    return ['appendToTagName', this.advance(char), char];
  },

  finishTagName: function() {
    return ['finishTagName', this.pos()];
  },

  finishTag: function(selfClosing) {
    if (selfClosing) this.advance('/');
    this.advance('>');
    return ['finishTag', this.pos(), selfClosing || false];
  },

  beginAttributeName: function() {
    return ['beginAttributeName', this.pos()];
  },

  appendToAttributeName: function(char) {
    if (typeof char === 'string') {
      return ['appendToAttributeName', this.advance(char), char];
    } else {
      return ['appendToAttributeName', this.skip(char.source.length), char];
    }
  },

  finishAttributeName: function() {
    return ['finishAttributeName', this.pos()];
  },

  beginWholeAttributeValue: function() {
    return ['beginWholeAttributeValue', this.pos()];
  },

  beginAttributeValue: function(quoted) {
    return ['beginAttributeValue', this.pos(), quoted];
  },

  appendToAttributeValue: function(char) {
    if (typeof char === 'string') {
      return ['appendToAttributeValue', this.advance(char), char];
    } else {
      return ['appendToAttributeValue', this.skip(char.source.length), char];
    }
  },

  finishAttributeValue: function(quoted) {
    return ['finishAttributeValue', this.pos(), quoted];
  },

  finishWholeAttributeValue: function() {
    return ['finishWholeAttributeValue', this.pos()];
  },

  voidAttributeValue: function() {
    return ['voidAttributeValue', this.pos()];
  }
}

function format(event) {
  let f = event[0];

  if (event[1]) {
    f += ": " + event[1].column + ":" + event[1].line;
  }

  if (event[2]) {
    f += " (" + formatData(event[2]) + ")";
  }

  return f;
}

function formatData(data) {
  if (typeof data === 'object' && data.chars && data.source) {
    return data.chars + " as  " + data.source;
  } else if (typeof data === 'object') {
    throw new Error("Unexpected event data: " + JSON.stringify(data));
  } else {
    return data;
  }
}

QUnit.assert.events = function(_expected, message) {
  var expected = [];
  expected.push(e.reset());
  expected.push(e.reset());

  _expected.forEach(function(e) {
    if (e.toEvents) {
      expected = expected.concat(e.toEvents());
    } else {
      expected.push(e);
    }
  });

  var expectedStrings = expected.map(format);

  var actualStrings = events.map(format);

  this.push(QUnit.equiv(actualStrings, expectedStrings), actualStrings, expectedStrings, message);
}

QUnit.module("simple-html-tokenizer - EventedTokenizer", {
  setup: setup
});

QUnit.test("Simple content", function(assert) {
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

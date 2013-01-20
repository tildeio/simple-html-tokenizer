module("HTML5Tokenizer");

function equalToken(actual, expected, message) {
  if (actual instanceof Array) { actual = actual[0]; }

  if (message) { message = message + ": "; }

  QUnit.push( actual.constructor === expected.constructor, actual.constructor.name, expected.constructor.name, message + "token type");
  QUnit.push( actual.tagName === expected.tagName, actual.tagName, expected.tagName, message + "tagName" );
  QUnit.push( actual.selfClosing === expected.selfClosing, actual.selfClosing, expected.selfClosing, message + "selfClosing" );
  QUnit.push( QUnit.equiv(actual.attributes, expected.attributes), actual.attributes, expected.attributes, message + "attributes" );
}

test("A simple tag", function() {
  var tokens = HTML5Tokenizer.tokenize("<div>");
  equalToken(tokens, new HTML5Tokenizer.StartTag("div"));
});

test("A simple tag with trailing spaces", function() {
  var tokens = HTML5Tokenizer.tokenize("<div   \t\n>");
  equalToken(tokens, new HTML5Tokenizer.StartTag("div"));
});

test("A simple closing tag", function() {
  var tokens = HTML5Tokenizer.tokenize("</div>");
  equalToken(tokens, new HTML5Tokenizer.EndTag("div"));
});

test("A simple closing tag with trailing spaces", function() {
  var tokens = HTML5Tokenizer.tokenize("</div   \t\n>");
  equalToken(tokens, new HTML5Tokenizer.EndTag("div"));
});

test("A tag with a single-quoted attribute", function() {
  var tokens = HTML5Tokenizer.tokenize("<div id='foo'>");
  equalToken(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo"]]));
});

test("A tag with a double-quoted attribute", function() {
  var tokens = HTML5Tokenizer.tokenize('<div id="foo">');
  equalToken(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo"]]));
});

test("A tag with unquoted attribute", function() {
  var tokens = HTML5Tokenizer.tokenize('<div id=foo>');
  equalToken(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo"]]));
});

test("A tag with multiple attributes", function() {
  var tokens = HTML5Tokenizer.tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  equalToken(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo"], ["class", "bar baz"], ["href", "bat"]]));
});

test("A self-closing tag", function() {
  var tokens = HTML5Tokenizer.tokenize('<img />');
  equalToken(tokens, new HTML5Tokenizer.StartTag("img", [], { selfClosing: true }));
});

test("A tag with a / in the middle", function() {
  var tokens = HTML5Tokenizer.tokenize('<img / src="foo.png">');
  equalToken(tokens, new HTML5Tokenizer.StartTag("img", [["src", "foo.png"]]));
});

test("An opening and closing tag with some content", function() {
  var tokens = HTML5Tokenizer.tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  equalToken(tokens[0], new HTML5Tokenizer.StartTag("div", [["id", "foo"], ["class", "{{bar}} baz"]]), "<div>");
  equalToken(tokens[1], new HTML5Tokenizer.Chars("Some content"), "content");
  equalToken(tokens[2], new HTML5Tokenizer.EndTag("div"), "</div>");
});

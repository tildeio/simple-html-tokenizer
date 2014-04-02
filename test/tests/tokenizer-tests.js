import { tokenize, Chars, StartTag, EndTag, CommentToken } from "simple-html-tokenizer";

QUnit.module("simple-html-tokenizer");

function equalToken(actual, expected, message) {
  if (actual instanceof Array) { actual = actual[0]; }

  if (message) { message = message + ": "; }

  QUnit.push( actual.constructor === expected.constructor, actual.constructor.name, expected.constructor.name, message + "token type");
  QUnit.push( actual.tagName === expected.tagName, actual.tagName, expected.tagName, message + "tagName" );
  QUnit.push( actual.selfClosing === expected.selfClosing, actual.selfClosing, expected.selfClosing, message + "selfClosing" );
  QUnit.push( QUnit.equiv(actual.attributes, expected.attributes), actual.attributes, expected.attributes, message + "attributes" );
}

test("Simple content", function() {
  var tokens = tokenize("hello");
  equalToken(tokens, new Chars("hello"));
});

test("A simple tag", function() {
  var tokens = tokenize("<div>");
  equalToken(tokens, new StartTag("div"));
});

test("A simple tag with trailing spaces", function() {
  var tokens = tokenize("<div   \t\n>");
  equalToken(tokens, new StartTag("div"));
});

test("A simple closing tag", function() {
  var tokens = tokenize("</div>");
  equalToken(tokens, new EndTag("div"));
});

test("A simple closing tag with trailing spaces", function() {
  var tokens = tokenize("</div   \t\n>");
  equalToken(tokens, new EndTag("div"));
});

test("A tag with a single-quoted attribute", function() {
  var tokens = tokenize("<div id='foo'>");
  equalToken(tokens, new StartTag("div", [["id", "foo"]]));
});

test("A tag with a double-quoted attribute", function() {
  var tokens = tokenize('<div id="foo">');
  equalToken(tokens, new StartTag("div", [["id", "foo"]]));
});

test("A tag with unquoted attribute", function() {
  var tokens = tokenize('<div id=foo>');
  equalToken(tokens, new StartTag("div", [["id", "foo"]]));
});

test("A tag with a nonterminal, valueless attribute", function() {
  var tokens = tokenize('<div disabled id=foo>');
  equalToken(tokens, new StartTag("div", [["disabled", null], ["id", "foo"]]));
});

test("A tag with multiple attributes", function() {
  var tokens = tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  equalToken(tokens, new StartTag("div", [["id", "foo"], ["class", "bar baz"], ["href", "bat"]]));
});

test("A self-closing tag", function() {
  var tokens = tokenize('<img />');
  equalToken(tokens, new StartTag("img", [], { selfClosing: true }));
});

test("A tag with a / in the middle", function() {
  var tokens = tokenize('<img / src="foo.png">');
  equalToken(tokens, new StartTag("img", [["src", "foo.png"]]));
});

test("An opening and closing tag with some content", function() {
  var tokens = tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  equalToken(tokens[0], new StartTag("div", [["id", "foo"], ["class", "{{bar}} baz"]]), "<div>");
  equalToken(tokens[1], new Chars("Some content"), "content");
  equalToken(tokens[2], new EndTag("div"), "</div>");
});

test("A comment", function() {
  var tokens = tokenize("<!-- hello -->");
  equalToken(tokens, new CommentToken(" hello "));
});

test("A (buggy) comment with no ending --", function() {
  var tokens = tokenize("<!-->");
  equalToken(tokens, new CommentToken(""));
});

test("A comment that immediately closes", function() {
  var tokens = tokenize("<!---->");
  equalToken(tokens, new CommentToken(""));
});

test("A comment that contains a -", function() {
  var tokens = tokenize("<!-- A perfectly legal - appears -->");
  equalToken(tokens, new CommentToken(" A perfectly legal - appears "));
});

test("A (buggy) comment that contains two --", function() {
  var tokens = tokenize("<!-- A questionable -- appears -->");
  equalToken(tokens, new CommentToken(" A questionable -- appears "));
});

import { tokenize, Chars, StartTag, EndTag, CommentToken } from "simple-html-tokenizer";

QUnit.module("simple-html-tokenizer");

function tokensEqual(actual, expected, message) {
  if (!(expected instanceof Array)) {
    expected = [expected];
  }

  deepEqual(actual, expected, message);
}

test("Simple content", function() {
  var tokens = tokenize("hello");
  tokensEqual(tokens, new Chars("hello"));
});

test("A simple tag", function() {
  var tokens = tokenize("<div>");
  tokensEqual(tokens, new StartTag("div"));
});

test("A simple tag with trailing spaces", function() {
  var tokens = tokenize("<div   \t\n>");
  tokensEqual(tokens, new StartTag("div"));
});

test("A simple closing tag", function() {
  var tokens = tokenize("</div>");
  tokensEqual(tokens, new EndTag("div"));
});

test("A simple closing tag with trailing spaces", function() {
  var tokens = tokenize("</div   \t\n>");
  tokensEqual(tokens, new EndTag("div"));
});

test("A tag with a single-quoted attribute", function() {
  var tokens = tokenize("<div id='foo'>");
  tokensEqual(tokens, new StartTag("div", [["id", "foo"]]));
});

test("A tag with a double-quoted attribute", function() {
  var tokens = tokenize('<div id="foo">');
  tokensEqual(tokens, new StartTag("div", [["id", "foo"]]));
});

test("A tag with unquoted attribute", function() {
  var tokens = tokenize('<div id=foo>');
  tokensEqual(tokens, new StartTag("div", [["id", "foo"]]));
});

test("A tag with a nonterminal, valueless attribute", function() {
  var tokens = tokenize('<div disabled id=foo>');
  tokensEqual(tokens, new StartTag("div", [["disabled", null], ["id", "foo"]]));
});

test("A tag with multiple attributes", function() {
  var tokens = tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  tokensEqual(tokens, new StartTag("div", [["id", "foo"], ["class", "bar baz"], ["href", "bat"]]));
});

test("A self-closing tag", function() {
  var tokens = tokenize('<img />');
  tokensEqual(tokens, new StartTag("img", [], { selfClosing: true }));
});

test("A tag with a / in the middle", function() {
  var tokens = tokenize('<img / src="foo.png">');
  tokensEqual(tokens, new StartTag("img", [["src", "foo.png"]]));
});

test("An opening and closing tag with some content", function() {
  var tokens = tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  tokensEqual(tokens, [
    new StartTag("div", [["id", "foo"], ["class", "{{bar}} baz"]]),
    new Chars("Some content"),
    new EndTag("div")
  ]);
});

test("A comment", function() {
  var tokens = tokenize("<!-- hello -->");
  tokensEqual(tokens, new CommentToken(" hello "));
});

test("A (buggy) comment with no ending --", function() {
  var tokens = tokenize("<!-->");
  tokensEqual(tokens, new CommentToken());
});

test("A comment that immediately closes", function() {
  var tokens = tokenize("<!---->");
  tokensEqual(tokens, new CommentToken());
});

test("A comment that contains a -", function() {
  var tokens = tokenize("<!-- A perfectly legal - appears -->");
  tokensEqual(tokens, new CommentToken(" A perfectly legal - appears "));
});

test("A (buggy) comment that contains two --", function() {
  var tokens = tokenize("<!-- A questionable -- appears -->");
  tokensEqual(tokens, new CommentToken(" A questionable -- appears "));
});

test("Character references are expanded", function() {
  var tokens = tokenize("&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;");
  tokensEqual(tokens, new Chars('"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸'), "in data");

  var tokens = tokenize("<div title='&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>");
  tokensEqual(tokens, new StartTag("div", [["title", '"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸']]), "in attributes");
});

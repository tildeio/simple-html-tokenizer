/* global SimpleHTMLTokenizer: false */
QUnit.module("simple-html-tokenizer - tokenizer");

QUnit.test("Simple content", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("hello");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.Chars("hello"));
});

QUnit.test("A simple tag", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<div>");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div"));
});

QUnit.test("A simple tag with trailing spaces", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<div   \t\n>");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div"));
});

QUnit.test("A simple closing tag", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("</div>");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.EndTag("div"));
});

QUnit.test("A simple closing tag with trailing spaces", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("</div   \t\n>");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.EndTag("div"));
});

QUnit.test("A pair of hyphenated tags", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<x-foo></x-foo>");
  assert.tokensEqual(tokens, [new SimpleHTMLTokenizer.StartTag("x-foo"), new SimpleHTMLTokenizer.EndTag("x-foo")]);
});

QUnit.test("A tag with a single-quoted attribute", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<div id='foo'>");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["id", "foo", true]]));
});

QUnit.test("A tag with a double-quoted attribute", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<div id="foo">');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["id", "foo", true]]));
});

QUnit.test("A tag with a double-quoted empty", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<div id="">');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["id", "", true]]));
});

QUnit.test("A tag with unquoted attribute", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<div id=foo>');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["id", "foo", false]]));
});

QUnit.test("A tag with valueless attributes", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<div foo bar>');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["foo", "", false], ["bar", "", false]]));
});

QUnit.test("A tag with multiple attributes", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["id", "foo", false], ["class", "bar baz", true], ["href", "bat", true]]));
});

QUnit.test("A tag with capitalization in attributes", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<svg viewBox="0 0 0 0">');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("svg", [["viewBox", "0 0 0 0", true]]));
});

QUnit.test("A tag with capitalization in the tag", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<linearGradient>');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("linearGradient", []));
});

QUnit.test("A self-closing tag", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<img />');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("img", [], { selfClosing: true }));
});

QUnit.test("A tag with a / in the middle", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize('<img / src="foo.png">');
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("img", [["src", "foo.png", true]]));
});

QUnit.test("An opening and closing tag with some content", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  assert.tokensEqual(tokens, [
    new SimpleHTMLTokenizer.StartTag("div", [["id", "foo", true], ["class", "{{bar}} baz", true]]),
    new SimpleHTMLTokenizer.Chars("Some content"),
    new SimpleHTMLTokenizer.EndTag("div")
  ]);
});

QUnit.test("A comment", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<!-- hello -->");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.CommentToken(" hello "));
});

QUnit.test("A (buggy) comment with no ending --", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<!-->");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.CommentToken());
});

QUnit.test("A comment that immediately closes", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<!---->");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.CommentToken());
});

QUnit.test("A comment that contains a -", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<!-- A perfectly legal - appears -->");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.CommentToken(" A perfectly legal - appears "));
});

QUnit.test("A (buggy) comment that contains two --", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<!-- A questionable -- appears -->");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.CommentToken(" A questionable -- appears "));
});

QUnit.test("Character references are expanded", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.Chars('"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸'), false, "in data");

  tokens = SimpleHTMLTokenizer.tokenize("<div title='&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>");
  assert.tokensEqual(tokens, new SimpleHTMLTokenizer.StartTag("div", [["title", '"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸', true]]), false, "in attributes");
});

QUnit.module("simple-html-tokenizer - preprocessing");

QUnit.test("Carriage returns are replaced with line feeds", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("\r\r\n\r\r\n\n");
  assert.tokensEqual(tokens, function (locInfo) {
    return locInfo(new SimpleHTMLTokenizer.Chars("\n\n\n\n\n"), 2, 0, 6, 0);
  });
});

QUnit.module("simple-html-tokenizer - location info");

QUnit.test("tokens: Chars start-tag Chars", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("Chars<div>Chars");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new SimpleHTMLTokenizer.Chars("Chars"), 1, 1, 1, 5),
      locInfo(new SimpleHTMLTokenizer.StartTag('div'), 1, 6, 1, 10),
      locInfo(new SimpleHTMLTokenizer.Chars("Chars"), 1, 11, 1, 15)
    ];
  });
});

QUnit.test("tokens: start-tag start-tag", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<div><div>");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new SimpleHTMLTokenizer.StartTag('div'), 1, 1, 1, 5),
      locInfo(new SimpleHTMLTokenizer.StartTag('div'), 1, 6, 1, 10)
    ];
  });
});

QUnit.test("tokens: Chars start-tag Chars start-tag", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("Chars\n<div>Chars\n<div>");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new SimpleHTMLTokenizer.Chars("Chars\n"), 1, 1, 2, 0),
      locInfo(new SimpleHTMLTokenizer.StartTag('div'), 2, 1, 2, 5),
      locInfo(new SimpleHTMLTokenizer.Chars("Chars\n"), 2, 6, 3, 0),
      locInfo(new SimpleHTMLTokenizer.StartTag('div'), 3, 1, 3, 5)
    ];
  });
});

QUnit.test("tokens: comment start-tag Chars end-tag ", function(assert) {
  var tokens = SimpleHTMLTokenizer.tokenize("<!-- multline\ncomment --><div foo=bar>Chars\n</div>");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new SimpleHTMLTokenizer.CommentToken(" multline\ncomment "), 1, 1, 2, 11),
      locInfo(new SimpleHTMLTokenizer.StartTag('div', [['foo', "bar", false]]), 2, 12, 2, 24),
      locInfo(new SimpleHTMLTokenizer.Chars("Chars\n"), 2, 25, 3, 0),
      locInfo(new SimpleHTMLTokenizer.EndTag('div'), 3, 1, 3, 6)
    ];
  });
});

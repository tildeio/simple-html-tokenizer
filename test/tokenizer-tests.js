/* global HTML5Tokenizer: false */
QUnit.module("simple-html-tokenizer - tokenizer");

QUnit.test("Simple content", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("hello");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Chars("hello"));
});

QUnit.test("A simple tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div>");
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div"));
});

QUnit.test("A simple tag with trailing spaces", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div   \t\n>");
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div"));
});

QUnit.test("A simple closing tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("</div>");
  assert.tokensEqual(tokens, new HTML5Tokenizer.EndTag("div"));
});

QUnit.test("A simple closing tag with trailing spaces", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("</div   \t\n>");
  assert.tokensEqual(tokens, new HTML5Tokenizer.EndTag("div"));
});

QUnit.test("A pair of hyphenated tags", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<x-foo></x-foo>");
  assert.tokensEqual(tokens, [new HTML5Tokenizer.StartTag("x-foo"), new HTML5Tokenizer.EndTag("x-foo")]);
});

QUnit.test("A tag with a single-quoted attribute", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div id='foo'>");
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo", true]]));
});

QUnit.test("A tag with a double-quoted attribute", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id="foo">');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo", true]]));
});

QUnit.test("A tag with a double-quoted empty", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id="">');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["id", "", true]]));
});

QUnit.test("A tag with unquoted attribute", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id=foo>');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo", false]]));
});

QUnit.test("A tag with valueless attributes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div foo bar>');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["foo", "", false], ["bar", "", false]]));
});

QUnit.test("A tag with multiple attributes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["id", "foo", false], ["class", "bar baz", true], ["href", "bat", true]]));
});

QUnit.test("A tag with capitalization in attributes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<svg viewBox="0 0 0 0">');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("svg", [["viewBox", "0 0 0 0", true]]));
});

QUnit.test("A tag with capitalization in the tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<linearGradient>');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("linearGradient", []));
});

QUnit.test("A self-closing tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<img />');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("img", [], true));
});

QUnit.test("A tag with a / in the middle", function(assert) {
  var tokens = HTML5Tokenizer.tokenize('<img / src="foo.png">');
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("img", [["src", "foo.png", true]]));
});

QUnit.test("An opening and closing tag with some content", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  assert.tokensEqual(tokens, [
    new HTML5Tokenizer.StartTag("div", [["id", "foo", true], ["class", "{{bar}} baz", true]]),
    new HTML5Tokenizer.Chars("Some content"),
    new HTML5Tokenizer.EndTag("div")
  ]);
});

QUnit.test("A comment", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- hello -->");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Comment(" hello "));
});

QUnit.test("A (buggy) comment with no ending --", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-->");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Comment());
});

QUnit.test("A comment that immediately closes", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!---->");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Comment());
});

QUnit.test("A comment that contains a -", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- A perfectly legal - appears -->");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Comment(" A perfectly legal - appears "));
});

QUnit.test("A (buggy) comment that contains two --", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- A questionable -- appears -->");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Comment(" A questionable -- appears "));
});

QUnit.test("Character references are expanded", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;");
  assert.tokensEqual(tokens, new HTML5Tokenizer.Chars('"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸'), false, "in data");

  tokens = HTML5Tokenizer.tokenize("<div title='&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>");
  assert.tokensEqual(tokens, new HTML5Tokenizer.StartTag("div", [["title", '"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸', true]]), false, "in attributes");
});

QUnit.module("simple-html-tokenizer - preprocessing");

QUnit.test("Carriage returns are replaced with line feeds", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("\r\r\n\r\r\n\n");
  assert.tokensEqual(tokens, function (locInfo) {
    return locInfo(new HTML5Tokenizer.Chars("\n\n\n\n\n"), 1, 0, 6, 0);
  });
});

QUnit.module("simple-html-tokenizer - location info");

QUnit.test("tokens: Chars start-tag Chars", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("Chars<div>Chars");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new HTML5Tokenizer.Chars("Chars"), 1, 0, 1, 5),
      locInfo(new HTML5Tokenizer.StartTag('div'), 1, 5, 1, 10),
      locInfo(new HTML5Tokenizer.Chars("Chars"), 1, 10, 1, 15)
    ];
  });
});

QUnit.test("tokens: start-tag start-tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<div><div>");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new HTML5Tokenizer.StartTag('div'), 1, 0, 1, 5),
      locInfo(new HTML5Tokenizer.StartTag('div'), 1, 5, 1, 10)
    ];
  });
});

QUnit.test("tokens: Chars start-tag Chars start-tag", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("Chars\n<div>Chars\n<div>");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new HTML5Tokenizer.Chars("Chars\n"), 1, 0, 2, 0),
      locInfo(new HTML5Tokenizer.StartTag('div'), 2, 0, 2, 5),
      locInfo(new HTML5Tokenizer.Chars("Chars\n"), 2, 5, 3, 0),
      locInfo(new HTML5Tokenizer.StartTag('div'), 3, 0, 3, 5)
    ];
  });
});

QUnit.test("tokens: comment start-tag Chars end-tag ", function(assert) {
  var tokens = HTML5Tokenizer.tokenize("<!-- multline\ncomment --><div foo=bar>Chars\n</div>");
  assert.tokensEqual(tokens, function (locInfo) {
    return [
      locInfo(new HTML5Tokenizer.Comment(" multline\ncomment "), 1, 0, 2, 11),
      locInfo(new HTML5Tokenizer.StartTag('div', [['foo', "bar", false]]), 2, 11, 2, 24),
      locInfo(new HTML5Tokenizer.Chars("Chars\n"), 2, 24, 3, 0),
      locInfo(new HTML5Tokenizer.EndTag('div'), 3, 0, 3, 6)
    ];
  });
});

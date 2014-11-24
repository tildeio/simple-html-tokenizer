import { tokenize, Chars, StartTag, EndTag, CommentToken } from "../../simple-html-tokenizer";
import { tokensEqual, locInfo } from "../../simple-html-tokenizer/helpers";

QUnit.module("simple-html-tokenizer - tokenizer");

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

test("A pair of hyphenated tags", function() {
  var tokens = tokenize("<x-foo></x-foo>");
  tokensEqual(tokens, [new StartTag("x-foo"), new EndTag("x-foo")]);
});

test("A tag with a single-quoted attribute", function() {
  var tokens = tokenize("<div id='foo'>");
  tokensEqual(tokens, new StartTag("div", [["id", "foo", true]]));
});

test("A tag with a double-quoted attribute", function() {
  var tokens = tokenize('<div id="foo">');
  tokensEqual(tokens, new StartTag("div", [["id", "foo", true]]));
});

test("A tag with a double-quoted empty", function() {
  var tokens = tokenize('<div id="">');
  tokensEqual(tokens, new StartTag("div", [["id", "", true]]));
});

test("A tag with unquoted attribute", function() {
  var tokens = tokenize('<div id=foo>');
  tokensEqual(tokens, new StartTag("div", [["id", "foo", false]]));
});

test("A tag with a nonterminal, valueless attribute", function() {
  var tokens = tokenize('<div disabled id=foo>');
  tokensEqual(tokens, new StartTag("div", [["disabled", null, null], ["id", "foo", false]]));
});

test("A tag with multiple attributes", function() {
  var tokens = tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  tokensEqual(tokens, new StartTag("div", [["id", "foo", false], ["class", "bar baz", true], ["href", "bat", true]]));
});

test("A tag with capitalization in attributes", function() {
  var tokens = tokenize('<svg viewBox="0 0 0 0">');
  tokensEqual(tokens, new StartTag("svg", [["viewBox", "0 0 0 0", true]]));
});

test("A tag with capitalization in the tag", function() {
  var tokens = tokenize('<linearGradient>');
  tokensEqual(tokens, new StartTag("linearGradient", []));
});

test("A self-closing tag", function() {
  var tokens = tokenize('<img />');
  tokensEqual(tokens, new StartTag("img", [], { selfClosing: true }));
});

test("A tag with a / in the middle", function() {
  var tokens = tokenize('<img / src="foo.png">');
  tokensEqual(tokens, new StartTag("img", [["src", "foo.png", true]]));
});

test("An opening and closing tag with some content", function() {
  var tokens = tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");

  tokensEqual(tokens, [
    new StartTag("div", [["id", "foo", true], ["class", "{{bar}} baz", true]]),
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
  tokensEqual(tokens, new Chars('"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸'), false, "in data");

  var tokens = tokenize("<div title='&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>");
  tokensEqual(tokens, new StartTag("div", [["title", '"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸', true]]), false, "in attributes");
});

QUnit.module("simple-html-tokenizer - preprocessing");

test("Carriage returns are replaced with line feeds", function() {
  var tokens = tokenize("\r\r\n\r\r\n\n");
  tokensEqual(tokens, locInfo(new Chars("\n\n\n\n\n"), 2, 0, 6, 0), true);
});

QUnit.module("simple-html-tokenizer - location info");

test("tokens: chars start-tag chars", function() {
  var tokens = tokenize("chars<div>chars");
  tokensEqual(tokens, [
    locInfo(new Chars("chars"), 1, 1, 1, 5),
    locInfo(new StartTag('div'), 1, 6, 1, 10),
    locInfo(new Chars("chars"), 1, 11, 1, 15)
  ], true);
});

test("tokens: start-tag start-tag", function() {
  var tokens = tokenize("<div><div>");
  tokensEqual(tokens, [
    locInfo(new StartTag('div'), 1, 1, 1, 5),
    locInfo(new StartTag('div'), 1, 6, 1, 10)
  ], true);
});

test("tokens: chars start-tag chars start-tag", function() {
  var tokens = tokenize("chars\n<div>chars\n<div>");
  tokensEqual(tokens, [
    locInfo(new Chars("chars\n"), 1, 1, 2, 0),
    locInfo(new StartTag('div'), 2, 1, 2, 5),
    locInfo(new Chars("chars\n"), 2, 6, 3, 0),
    locInfo(new StartTag('div'), 3, 1, 3, 5)
  ], true);
});

test("tokens: comment start-tag chars end-tag ", function() {
  var tokens = tokenize("<!-- multline\ncomment --><div foo=bar>chars\n</div>");
  tokensEqual(tokens, [
    locInfo(new CommentToken(" multline\ncomment "), 1, 1, 2, 11),
    locInfo(new StartTag('div', [['foo', "bar", false]]), 2, 12, 2, 24),
    locInfo(new Chars("chars\n"), 2, 25, 3, 0),
    locInfo(new EndTag('div'), 3, 1, 3, 6)
  ], true);
});

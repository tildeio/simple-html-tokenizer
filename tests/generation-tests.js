(function() {

module("Generation");

var tokenize = HTML5Tokenizer.tokenize;
var generate = HTML5Tokenizer.generate;

function generates(source, expected) {
  var actual = generate(tokenize(source));
  QUnit.push(actual === expected, actual, expected);
}

test("A simple tag", function() {
  generates("<div>", "<div>");
});

test("A simple tag with spce", function() {
  generates("<div  >", "<div>");
});

test("A tag with a double-quoted attribute", function() {
  generates('<div id="foo">', '<div id="foo">');
});

test("A tag with a single-quoted attribute", function() {
  generates("<div id='foo'>", '<div id="foo">');
});

test("A tag with an unquoted attribute", function() {
  generates("<div id=foo>", '<div id="foo">');
});

test("A tag with a quotation mark in a single-quoted attribute", function() {
  generates("<div id='foo\"bar'>", '<div id="foo\\"bar">');
});

})();

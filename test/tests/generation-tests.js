import { tokenize, generate } from "simple-html-tokenizer";

QUnit.module("simple-html-tokenizer - generation");

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

test("A tag containing characters", function() {
  generates("<div id='foo'>\n\tone fish\n\ttwo fish\n</div>", '<div id="foo">\n\tone fish\n\ttwo fish\n</div>');
});

test("A comment", function() {
  generates("<!-- hello -->", "<!-- hello -->");
});

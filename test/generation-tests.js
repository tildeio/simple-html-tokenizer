QUnit.module("simple-html-tokenizer - generation");

QUnit.test("A simple tag", function(assert) {
  assert.generates("<div>", "<div>");
});

QUnit.test("A simple tag with spce", function(assert) {
  assert.generates("<div  >", "<div>");
});

QUnit.test("A tag with a double-quoted attribute", function(assert) {
  assert.generates('<div id="foo">', '<div id="foo">');
});

QUnit.test("A tag with a single-quoted attribute", function(assert) {
  assert.generates("<div id='foo'>", '<div id="foo">');
});

QUnit.test("A tag with an unquoted attribute", function(assert) {
  assert.generates("<div id=foo>", '<div id="foo">');
});

QUnit.test("A tag with a quotation mark in a single-quoted attribute", function(assert) {
  assert.generates("<div id='foo\"bar'>", '<div id="foo\\"bar">');
});

QUnit.test("A tag containing characters", function(assert) {
  assert.generates("<div id='foo'>\n\tone fish\n\ttwo fish\n</div>", '<div id="foo">\n\tone fish\n\ttwo fish\n</div>');
});

QUnit.test("A comment", function(assert) {
  assert.generates("<!-- hello -->", "<!-- hello -->");
});

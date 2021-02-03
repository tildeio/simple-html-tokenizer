import {
  tokenize,
  EventedTokenizer,
  TokenizerDelegate,
  EntityParser,
  Doctype,
  StartTag,
  EndTag,
  Comment,
  Chars,
  Token,
  TokenType,
  Attribute
} from 'simple-html-tokenizer';

QUnit.module('simple-html-tokenizer - tokenizer');

QUnit.test('does not fail if delegate does not include doctype methods', function(assert) {
  let steps: Array<string[]> = [];

  class MissingDoctypeTokenizerDelegate implements TokenizerDelegate {
    reset() {
      steps.push(['reset']);
    }
    finishData() {
      steps.push(['finishData']);
    }
    tagOpen() {
      steps.push(['tagOpen']);
    }

    beginData() {
      steps.push(['beginData']);
    }

    appendToData(char: string) {
      steps.push(['appendToData', char]);
    }

    beginStartTag() {
      steps.push(['beginStartTag']);
    }
    appendToTagName(char: string) {
      steps.push(['appendToTagName', char]);
    }

    beginAttribute() {
      steps.push(['beginAttribute']);
    }
    appendToAttributeName(char: string) {
      steps.push(['appendToAttributeName', char]);
    }
    beginAttributeValue(quoted: boolean) {
      steps.push(['beginAttributeValue', `${quoted}`]);
    }

    appendToAttributeValue(char: string) {
      steps.push(['appendToAttributeValue', char]);
    }
    finishAttributeValue() {
      steps.push(['finishAttributeValue']);
    }

    markTagAsSelfClosing() {
      steps.push(['markTagAsSelfClosing']);
    }

    beginEndTag() {
      steps.push(['beginEndTag']);
    }
    finishTag() {
      steps.push(['finishTag']);
    }

    beginComment() {
      steps.push(['beginComment']);
    }
    appendToCommentData(char: string) {
      steps.push(['appendToCommentData', char]);
    }
    finishComment() {
      steps.push(['finishComment']);
    }

    reportSyntaxError(error: string) {
      steps.push(['reportSyntaxError', error]);
    }
  }

  let delegate = new MissingDoctypeTokenizerDelegate();
  let tokenizer = new EventedTokenizer(delegate, new EntityParser({}));

  tokenizer.tokenize('\n<!-- comment here --><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">\n<!-- comment here -->');

  assert.deepEqual(steps, [
    [ "reset" ],
    [ "reset" ],
    [ "beginData" ],
    [ "appendToData", "\n" ],
    [ "finishData" ],
    [ "tagOpen" ],
    [ "beginComment" ],
    [ "appendToCommentData", " " ],
    [ "appendToCommentData", "c" ],
    [ "appendToCommentData", "o" ],
    [ "appendToCommentData", "m" ],
    [ "appendToCommentData", "m" ],
    [ "appendToCommentData", "e" ],
    [ "appendToCommentData", "n" ],
    [ "appendToCommentData", "t" ],
    [ "appendToCommentData", " " ],
    [ "appendToCommentData", "h" ],
    [ "appendToCommentData", "e" ],
    [ "appendToCommentData", "r" ],
    [ "appendToCommentData", "e" ],
    [ "appendToCommentData", " " ],
    [ "finishComment" ],
    [ "tagOpen" ],
    [ "beginData" ],
    [ "appendToData", "\n" ],
    [ "finishData" ],
    [ "tagOpen" ],
    [ "beginComment" ],
    [ "appendToCommentData", " " ],
    [ "appendToCommentData", "c" ],
    [ "appendToCommentData", "o" ],
    [ "appendToCommentData", "m" ],
    [ "appendToCommentData", "m" ],
    [ "appendToCommentData", "e" ],
    [ "appendToCommentData", "n" ],
    [ "appendToCommentData", "t" ],
    [ "appendToCommentData", " " ],
    [ "appendToCommentData", "h" ],
    [ "appendToCommentData", "e" ],
    [ "appendToCommentData", "r" ],
    [ "appendToCommentData", "e" ],
    [ "appendToCommentData", " " ],
    [ "finishComment" ]
  ]);
});

QUnit.test('Doctype', function(assert) {
  let tokens = tokenize('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">');
  assert.deepEqual(tokens, [ doctype('-//W3C//DTD HTML 4.01//EN', 'http://www.w3.org/TR/html4/strict.dtd') ], 'Standard HTML 4.01 Strict doctype');

  tokens = tokenize('<!DOCTYPE html><html><body></body></html>');
  assert.deepEqual(tokens, [
    doctype(),
    startTag('html'),
    startTag('body'),
    endTag('body'),
    endTag('html'),
  ], 'DOCTYPE is included in tokens');

  tokens = tokenize('<!-- comment --><!DOCTYPE html>');
  assert.deepEqual(tokens, [comment(' comment '), doctype()], 'DOCTYPE after comments is valid');

  tokens = tokenize('<!-- comment --><!DOCTYPE html PUBLIC >');
  assert.deepEqual(tokens, [comment(' comment '), doctype()], 'DOCTYPE after comments is valid');
});

QUnit.test('Simple content', function(assert) {
  let tokens = tokenize('hello');
  assert.deepEqual(tokens, [chars('hello')]);
});

QUnit.test('A simple tag', function(assert) {
  let tokens = tokenize('<div>');
  assert.deepEqual(tokens, [startTag('div')]);
});

QUnit.test('A simple tag with trailing spaces', function(assert) {
  let tokens = tokenize('<div   \t\n>');
  assert.deepEqual(tokens, [startTag('div')]);
});

QUnit.test('A simple closing tag', function(assert) {
  let tokens = tokenize('</div>');
  assert.deepEqual(tokens, [endTag('div')]);
});

QUnit.test('A simple closing tag with trailing spaces', function(assert) {
  let tokens = tokenize('</div   \t\n>');
  assert.deepEqual(tokens, [endTag('div')]);
});

QUnit.test('A pair of hyphenated tags', function(assert) {
  let tokens = tokenize('<x-foo></x-foo>');
  assert.deepEqual(tokens, [startTag('x-foo'), endTag('x-foo')]);
});

QUnit.test('A tag with a single-quoted attribute', function(assert) {
  let tokens = tokenize("<div id='foo'>");
  assert.deepEqual(tokens, [startTag('div', [['id', 'foo', true]])]);
});

QUnit.test('A tag with a double-quoted attribute', function(assert) {
  let tokens = tokenize('<div id="foo">');
  assert.deepEqual(tokens, [startTag('div', [['id', 'foo', true]])]);
});

QUnit.test('A tag with a double-quoted empty', function(assert) {
  let tokens = tokenize('<div id="">');
  assert.deepEqual(tokens, [startTag('div', [['id', '', true]])]);
});

QUnit.test('A tag with unquoted attribute', function(assert) {
  let tokens = tokenize('<div id=foo>');
  assert.deepEqual(tokens, [startTag('div', [['id', 'foo', false]])]);
});

QUnit.test('A tag with valueless attributes', function(assert) {
  let tokens = tokenize('<div foo bar>');
  assert.deepEqual(tokens, [
    startTag('div', [['foo', '', false], ['bar', '', false]])
  ]);
});

QUnit.test('Missing attribute name', function(assert) {
  let tokens = tokenize('<div =foo>');
  assert.deepEqual(tokens, [
    withSyntaxError(
      'attribute name cannot start with equals sign',
      startTag('div', [['=foo', '', false]])
    )
  ]);
});

QUnit.test('Invalid character in attribute name', function(assert) {
  let tokens = tokenize('<div ">');
  assert.deepEqual(tokens, [
    withSyntaxError(
      '" is not a valid character within attribute names',
      startTag('div', [['"', '', false]])
    )
  ]);
});

QUnit.test('A tag with multiple attributes', function(assert) {
  let tokens = tokenize('<div id=foo class="bar baz" href=\'bat\'>');
  assert.deepEqual(tokens, [
    startTag('div', [
      ['id', 'foo', false],
      ['class', 'bar baz', true],
      ['href', 'bat', true]
    ])
  ]);
});

QUnit.test('A tag with capitalization in attributes', function(assert) {
  let tokens = tokenize('<svg viewBox="0 0 0 0">');
  assert.deepEqual(tokens, [startTag('svg', [['viewBox', '0 0 0 0', true]])]);
});

QUnit.test('A tag with capitalization in the tag', function(assert) {
  let tokens = tokenize('<linearGradient>');
  assert.deepEqual(tokens, [startTag('linearGradient', [])]);
});

QUnit.test('A self-closing tag', function(assert) {
  let tokens = tokenize('<img />');
  assert.deepEqual(tokens, [startTag('img', [], true)]);
});

QUnit.test(
  'A self-closing tag with valueless attributes (regression)',
  function(assert) {
    let tokens = tokenize('<input disabled />');
    assert.deepEqual(tokens, [
      startTag('input', [['disabled', '', false]], true)
    ]);
  }
);

QUnit.test(
  'A self-closing tag with valueless attributes without space before closing (regression)',
  function(assert) {
    let tokens = tokenize('<input disabled/>');
    assert.deepEqual(tokens, [
      startTag('input', [['disabled', '', false]], true)
    ]);
  }
);

QUnit.test(
  'A self-closing tag with an attribute with unquoted value without space before closing (regression)',
  function(assert) {
    let tokens = tokenize('<input data-foo=bar/>');
    assert.deepEqual(tokens, [
      startTag('input', [['data-foo', 'bar', false]], true)
    ]);
  }
);

QUnit.test('A tag with a / in the middle', function(assert) {
  let tokens = tokenize('<img / src="foo.png">');
  assert.deepEqual(tokens, [startTag('img', [['src', 'foo.png', true]])]);
});

QUnit.test('An opening and closing tag with some content', function(assert) {
  let tokens = tokenize("<div id='foo' class='{{bar}} baz'>Some content</div>");
  assert.deepEqual(tokens, [
    startTag('div', [['id', 'foo', true], ['class', '{{bar}} baz', true]]),
    chars('Some content'),
    endTag('div')
  ]);
});

QUnit.test('A comment', function(assert) {
  let tokens = tokenize('<!-- hello -->');
  assert.deepEqual(tokens, [comment(' hello ')]);
});

QUnit.test('A (buggy) comment with no ending --', function(assert) {
  let tokens = tokenize('<!-->');
  assert.deepEqual(tokens, [comment()]);
});

QUnit.test('A comment that immediately closes', function(assert) {
  let tokens = tokenize('<!---->');
  assert.deepEqual(tokens, [comment()]);
});

QUnit.test('A comment that contains a -', function(assert) {
  let tokens = tokenize('<!-- A perfectly legal - appears -->');
  assert.deepEqual(tokens, [comment(' A perfectly legal - appears ')]);
});

QUnit.test('A (buggy) comment that contains two --', function(assert) {
  let tokens = tokenize('<!-- A questionable -- appears -->');
  assert.deepEqual(tokens, [comment(' A questionable -- appears ')]);
});

QUnit.test('Character references are expanded', function(assert) {
  let tokens = tokenize(
    '&quot;Foo &amp; Bar&quot; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'
  );
  assert.deepEqual(tokens, [chars('"Foo & Bar" < << < < ≧̸ &Borksnorlax; ≦̸')]);

  tokens = tokenize(
    "<div title='&quot;Foo &amp; Bar&quot; &blk12; &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax; &nleqq;'>"
  );
  assert.deepEqual(tokens, [
    startTag('div', [
      ['title', '"Foo & Bar" ▒ < << < < ≧̸ &Borksnorlax; ≦̸', true]
    ])
  ]);
});

// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
QUnit.test('A newline immediately following a <pre> tag is stripped', function(assert) {
  let tokens = tokenize("<pre>\nhello</pre>");
  assert.deepEqual(tokens, [startTag('pre'), chars('hello'), endTag('pre')]);
});

QUnit.test('A newline immediately following a closing </pre> tag is not stripped', function(assert) {
  let tokens = tokenize("\n<pre>\nhello</pre>\n");
  assert.deepEqual(tokens, [chars('\n'), startTag('pre'), chars('hello'), endTag('pre'), chars('\n')]);
});

// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
QUnit.test('A newline immediately following a <PRE> tag is stripped', function(assert) {
  let tokens = tokenize("<PRE>\nhello</PRE>");
  assert.deepEqual(tokens, [startTag('PRE'), chars('hello'), endTag('PRE')]);
});

// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
QUnit.test('A newline immediately following a <textarea> tag is stripped', function(assert) {
  let tokens = tokenize("<textarea>\nhello</textarea>");
  assert.deepEqual(tokens, [startTag('textarea'), chars('hello'), endTag('textarea')]);
});

// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
QUnit.test('codemod: A newline immediately following a <pre> tag is stripped', function(assert) {
  let tokens = tokenize("<pre>\nhello</pre>", { mode: 'codemod' });
  assert.deepEqual(tokens, [startTag('pre'), chars('\nhello'), endTag('pre')]);
});

QUnit.test('codemod: A newline immediately following a closing </pre> tag is not stripped', function(assert) {
  let tokens = tokenize("\n<pre>\nhello</pre>\n", { mode: 'codemod' });
  assert.deepEqual(tokens, [chars('\n'), startTag('pre'), chars('\nhello'), endTag('pre'), chars('\n')]);
});

// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
QUnit.test('codemod: A newline immediately following a <PRE> tag is stripped', function(assert) {
  let tokens = tokenize("<PRE>\nhello</PRE>", { mode: 'codemod' });
  assert.deepEqual(tokens, [startTag('PRE'), chars('\nhello'), endTag('PRE')]);
});

// https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
QUnit.test('codemod: A newline immediately following a <textarea> tag is stripped', function(assert) {
  let tokens = tokenize("<textarea>\nhello</textarea>", { mode: 'codemod' });
  assert.deepEqual(tokens, [startTag('textarea'), chars('\nhello'), endTag('textarea')]);
});

// https://html.spec.whatwg.org/multipage/semantics.html#the-title-element
QUnit.test('The title element content is always text', function(assert) {
  let tokens = tokenize("<title>&quot;hey <b>there</b><!-- comment --></title>");
  assert.deepEqual(tokens, [startTag('title'), chars('"hey <b>there</b><!-- comment -->'), endTag('title')]);
});

// https://github.com/emberjs/ember.js/issues/18530
QUnit.test('Title element content is not text', function(assert) {
  let tokens = tokenize("<Title><!-- hello --></Title>");
  assert.deepEqual(tokens, [startTag('Title'), comment(' hello '), endTag('Title')]);
});

// https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
QUnit.test('The style element content is always text', function(assert) {
  let tokens = tokenize("<style>&quot;hey <b>there</b><!-- comment --></style>");
  assert.deepEqual(tokens, [startTag('style'), chars('&quot;hey <b>there</b><!-- comment -->'), endTag('style')]);
});

// https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
QUnit.test('The script element content restrictions', function(assert) {
  let tokens = tokenize("<script>&quot;hey <b>there</b><!-- comment --></script>");
  assert.deepEqual(tokens, [startTag('script'), chars('&quot;hey <b>there</b><!-- comment -->'), endTag('script')]);
});

QUnit.test('Two following script tags', function(assert) {
  let tokens = tokenize("<script><!-- comment --></script> <script>second</script>");

  assert.deepEqual(tokens, [
    startTag('script'),
    chars('<!-- comment -->'),
    endTag('script'),
    chars(' '),
    startTag('script'),
    chars('second'),
    endTag('script')
  ]);
});

// https://github.com/emberjs/rfcs/blob/master/text/0311-angle-bracket-invocation.md#dynamic-invocations
QUnit.test('An Emberish named arg invocation', function(assert) {
  let tokens = tokenize('<@foo></@foo>');
  assert.deepEqual(tokens, [startTag('@foo'), endTag('@foo')]);
});

QUnit.test('Parsing <script>s out of a complext HTML document [stefanpenner/find-scripts-srcs-in-document#1]', function(assert) {
  let input = `<!DOCTYPE html><html><head><script src="/foo.js"></script><script src="/bar.js"></script><script src="/baz.js"></script></head></html>`;

  let tokens = tokenize(input);
  assert.deepEqual(tokens, [
    doctype(),
    startTag('html'),
    startTag('head'),
    startTag('script', [['src','/foo.js', true]]),
    endTag('script'),
    startTag('script', [['src','/bar.js', true]]),
    endTag('script'),
    startTag('script', [['src','/baz.js', true]]),
    endTag('script'),
    endTag('head'),
    endTag('html'),
  ]);
});

QUnit.module('simple-html-tokenizer - preprocessing');

QUnit.test('Carriage returns are replaced with line feeds', function(assert) {
  let tokens = tokenize('\r\r\n\r\r\n\n');
  assert.deepEqual(tokens, [chars('\n\n\n\n\n')]);
});

QUnit.module('simple-html-tokenizer - location info');

QUnit.test('lines are counted correctly', function(assert) {
  let tokens = tokenize('\r\r\n\r\r\n\n', { loc: true });
  assert.deepEqual(tokens, [locInfo(chars('\n\n\n\n\n'), 1, 0, 6, 0)]);
});

QUnit.test('tokens: Chars', function(assert) {
  let tokens = tokenize('Chars', { loc: true });
  assert.deepEqual(tokens, [locInfo(chars('Chars'), 1, 0, 1, 5)]);
});

QUnit.test('tokens: Chars start-tag Chars', function(assert) {
  let tokens = tokenize('Chars<div>Chars', { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars('Chars'), 1, 0, 1, 5),
    locInfo(startTag('div'), 1, 5, 1, 10),
    locInfo(chars('Chars'), 1, 10, 1, 15)
  ]);
});

QUnit.test('tokens: start-tag start-tag', function(assert) {
  let tokens = tokenize('<div><div>', { loc: true });
  assert.deepEqual(tokens, [
    locInfo(startTag('div'), 1, 0, 1, 5),
    locInfo(startTag('div'), 1, 5, 1, 10)
  ]);
});

QUnit.test('tokens: html char ref start-tag', function(assert) {
  let tokens = tokenize('&gt;<div>', { loc: true });
  assert.deepEqual(tokens, [
    locInfo(chars('>'), 1, 0, 1, 4),
    locInfo(startTag('div'), 1, 4, 1, 9)
  ]);
});

QUnit.test('tokens: Chars start-tag Chars start-tag', function(assert) {
  let tokens = tokenize('Chars\n<div>Chars\n<div>', {
    loc: true
  });
  assert.deepEqual(tokens, [
    locInfo(chars('Chars\n'), 1, 0, 2, 0),
    locInfo(startTag('div'), 2, 0, 2, 5),
    locInfo(chars('Chars\n'), 2, 5, 3, 0),
    locInfo(startTag('div'), 3, 0, 3, 5)
  ]);
});

QUnit.test('tokens: comment start-tag Chars end-tag', function(assert) {
  let tokens = tokenize(
    '<!-- multline\ncomment --><div foo=bar>Chars\n</div>',
    { loc: true }
  );
  assert.deepEqual(tokens, [
    locInfo(comment(' multline\ncomment '), 1, 0, 2, 11),
    locInfo(startTag('div', [['foo', 'bar', false]]), 2, 11, 2, 24),
    locInfo(chars('Chars\n'), 2, 24, 3, 0),
    locInfo(endTag('div'), 3, 0, 3, 6)
  ]);
});

function chars(s?: string): Chars {
  return {
    type: TokenType.Chars,
    chars: s === undefined ? '' : s
  };
}

function comment(s?: string): Comment {
  return {
    type: TokenType.Comment,
    chars: s === undefined ? '' : s
  };
}

function startTag(
  tagName: string,
  attributes?: Attribute[],
  selfClosing?: boolean
): StartTag {
  return {
    type: TokenType.StartTag,
    tagName: tagName,
    attributes: attributes === undefined ? [] : attributes,
    selfClosing: selfClosing === undefined ? false : selfClosing
  };
}

function endTag(tagName: string): EndTag {
  return {
    type: TokenType.EndTag,
    tagName: tagName
  };
}

function doctype(publicIdentifier?: string, systemIdentifier?: string): Doctype {
  let doctype: Doctype = {
    type: TokenType.Doctype,
    name: 'html',
  };

  if (publicIdentifier) {
    doctype.publicIdentifier = publicIdentifier;
  }

  if (systemIdentifier) {
    doctype.systemIdentifier = systemIdentifier;
  }

  return doctype;
}

function locInfo(
  token: Token,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number
) {
  token.loc = {
    start: {
      line: startLine,
      column: startColumn
    },
    end: {
      line: endLine,
      column: endColumn
    }
  };

  return token;
}

function withSyntaxError(message: string, result: Token) {
  result.syntaxError = message;
  return result;
}

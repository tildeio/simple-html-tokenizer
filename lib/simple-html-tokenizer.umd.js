/* global define:false, module:false */
import {
  Tokenizer, tokenize, generate, configure, original, StartTag, EndTag, Chars, CommentToken
} from './simple-html-tokenizer';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.SimpleHTMLTokenizer = factory();
  }
}(this, function () {
  return {
    Tokenizer: Tokenizer,
    tokenize: tokenize,
    generate: generate,
    configure: configure,
    original: original,
    StartTag: StartTag,
    EndTag: EndTag,
    Chars: Chars,
    CommentToken: CommentToken
  };
}));

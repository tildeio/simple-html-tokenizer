import { default as Tokenizer, Token } from './tokenizer';
import EntityParser from './entity-parser';
import namedCharRefs from './html5-named-char-refs';

export default function tokenize(input, options): Token[] {
  var tokenizer = new Tokenizer(new EntityParser(namedCharRefs), options);
  return tokenizer.tokenize(input);
}

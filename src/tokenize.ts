import Tokenizer from './tokenizer';
import EntityParser from './entity-parser';
import namedCharRefs from './generated/html5-named-char-refs';
import { TokenizerOptions, Token } from './types';

export default function tokenize(
  input: string,
  options?: TokenizerOptions
): Token[] {
  let tokenizer = new Tokenizer(new EntityParser(namedCharRefs), options);
  return tokenizer.tokenize(input);
}

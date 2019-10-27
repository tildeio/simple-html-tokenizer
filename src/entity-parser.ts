import { fromCodePoint } from 'utf16-char-codes';
import { NamedEntityMap } from './types';

const HEXCHARCODE = /^#[xX]([A-Fa-f0-9]+)$/;
const CHARCODE = /^#([0-9]+)$/;
const NAMED = /^([A-Za-z0-9]+)$/;

export default class EntityParser {
  constructor(private named: NamedEntityMap) {}

  parse(entity: string): string | undefined {
    if (!entity) {
      return;
    }
    let matches = entity.match(HEXCHARCODE);
    if (matches) {
      return fromCodePoint(parseInt(matches[1], 16));
    }
    matches = entity.match(CHARCODE);
    if (matches) {
      return fromCodePoint(parseInt(matches[1], 10));
    }
    matches = entity.match(NAMED);
    if (matches) {
      return this.named[matches[1]];
    }
  }
}

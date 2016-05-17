interface TokenizerPosition {
  line: number;
  column: number;
}

interface EventGroup {
  toEvents(): TokenizerEvent<opaque>[];
}

type SimpleEvent = [string] | [string, TokenizerPosition];
type TokenizerEvent<T> = SimpleEvent | [string, TokenizerPosition, T]
type opaque = {} | void;

interface QUnitAssert {
  events(_expected: (TokenizerEvent<opaque> | EventGroup)[], message?: string): void;
}
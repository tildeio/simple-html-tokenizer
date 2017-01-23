// export type Option<T> = T | null;
// export type Maybe<T> = T | null | undefined;
// export type opaque = {} | void;

// function unwrap<T>(o: Option<T>): T {
//   if (o) return o;

//   throw new Error(`unwrapping ${o}, which shouldn't be null`);
// }

// interface Constructor<T> {
//   new(...args: any[]): T;
// }

// interface EventHandler {
//   whitespace(token: Whitespace);
//   data(token: Data);
//   openTag(token: OpenTag);
//   finishTag(token: FinishTag);
//   attrName(token: AttributeName);
//   startTag(token: StartTag);
//   endTag(token: EndTag);
// }

// abstract class Delegate {
//   protected state: string;

//   constructor(public handler: EventHandler) {}

//   whitespace(pos: Position, char: string): Delegate {
//     let ws = new WhitespaceBuilder(new LocationBuilder(pos), this.handler).pushChar(char).toToken();
//     this.handler.whitespace(ws);
//     return this;
//   }

//   beginData(pos: Position): Delegate {
//     throw new Error(`beginData is illegal in ${this.state}`);
//   }

//   appendToData(pos: Position, char: string): Delegate {
//     throw new Error(`appendToData is illegal in ${this.state}`);
//   }

//   finishData(pos: Position): Delegate {
//     throw new Error(`finishData is illegal in ${this.state}`);
//   }

//   openTag(pos: Position, kind: 'start' | 'end'): Delegate {
//     throw new Error(`openTag is illegal in ${this.state}`);
//   }

//   beginTagName(pos: Position): Delegate {
//     throw new Error(`beginTag is illegal in ${this.state}`);
//   }

//   appendToTagName(pos: Position, char: string): Delegate {
//     throw new Error(`appendToTagName is illegal in ${this.state}`);
//   }

//   finishTagName(pos: Position): Delegate {
//     throw new Error(`finishTagName is illegal in ${this.state}`);
//   }

//   beginAttributeName(pos: Position): Delegate {
//     throw new Error(`beginAttributeName is illegal in ${this.state}`);
//   }

//   appendToAttributeName(pos: Position, char: string) {
//     throw new Error(`appendToAttributeName is illegal in ${this.state}`);
//   }

//   finishTag(pos: Position, selfClosing: boolean): Delegate {
//     throw new Error(`finishTag is illegal in ${this.state}`);
//   }
// }

// abstract class PositionedDelegate extends Delegate {
//   constructor(public loc: LocationBuilder, handler: EventHandler) {
//     super(handler);
//   }
// }

// export abstract class CharBuilder extends PositionedDelegate {
//   protected chars = '';

//   pushChar(char: string): this {
//     this.chars += char;
//     return this;
//   }
// }

// export class Position {
//   constructor(public line: number, public column: number) {}

//   advance(char: string): Position {
//     if (char === '\n') {
//       return new Position(this.line + 1, 0);
//     } else {
//       return new Position(this.line, this.column + 1);
//     }
//   }
// }

// export class Location {
//   static forChar(start: Position, char: string) {
//     return new Location(start, start.advance(char));
//   }

//   constructor(public start: Position, public end: Position) {}
// }

// export class LocationBuilder {
//   private _end: Option<Position> = null;

//   constructor(public start: Position) {}

//   end(pos: Position): this {
//     this._end = pos;
//     return this;
//   }

//   toLocation(): Location {
//     return new Location(this.start, unwrap(this._end));
//   }
// }

// export class Token {
//   constructor(public loc: Location) {};
// }

// export class Whitespace extends Token {
//   constructor(loc: Location, public chars: string) {
//     super(loc);
//   }
// }

// class WhitespaceBuilder extends CharBuilder {
//   static withStart(start: Position, handler: EventHandler): WhitespaceBuilder {
//     return new WhitespaceBuilder(new LocationBuilder(start), handler);
//   }

//   toToken(): Whitespace {
//     return new Whitespace(this.loc.toLocation(), this.chars);
//   }
// }

// class BaseBuilder extends Delegate {
//   protected state = "base";

//   openTag(pos: Position, kind: 'start' | 'end'): Delegate {
//     let endToken = pos.advance('<');
//     if (kind === 'end') endToken = endToken.advance('/');
//     this.handler.openTag(new OpenTag(new Location(pos, endToken)));

//     if (kind === 'start') {
//       return new StartTagBuilder(new LocationBuilder(pos), this.handler);
//     } else {
//       return new EndTagBuilder(new LocationBuilder(pos), this.handler);
//     }
//   }

//   beginData(pos: Position): DataBuilder {
//     return DataBuilder.withStart(pos, this.handler);
//   }
// }

// class DataBuilder extends CharBuilder {
//   protected state = "data";

//   static withStart(start: Position, handler: EventHandler): DataBuilder {
//     return new DataBuilder(new LocationBuilder(start), handler);
//   }

//   appendToData(pos: Position, char: string): this {
//     this.pushChar(char);
//     return this;
//   }

//   finishData(pos: Position): BaseBuilder {
//     this.handler.data(new Data(this.loc.end(pos).toLocation(), this.chars));
//     return new BaseBuilder(this.handler);
//   }
// }

// abstract class TagBuilder extends PositionedDelegate {
//   public kind: 'start' | 'end';

//   beginTagName(pos: Position): TagNameBuilder {
//     return new TagNameBuilder(new LocationBuilder(pos), this.handler, this);
//   }

//   finishTag(pos: Position, selfClosing: boolean): Delegate {
//     throw new Error(`finishTag is illegal in ${this.state}`);
//   }
// }

// class TagNameBuilder extends CharBuilder {
//   constructor(loc: LocationBuilder, handler: EventHandler, private tag: TagBuilder) {
//     super(loc, handler);
//   }

//   appendToTagName(pos: Position, char: string): this {
//     this.pushChar(char);
//     return this;
//   }

//   finishTagName(pos: Position): TagBodyBuilder {
//     let name = new TagName(this.loc.end(pos).toLocation(), this.chars);
//     return new TagBodyBuilder(this.tag, name);
//   }
// }

// class TagBodyBuilder extends Delegate {
//   finishTag(pos: Position, selfClosing: boolean): BaseBuilder {
//     let endToken = selfClosing ? pos.advance('/').advance('>') : pos.advance('>');
//     this.handler.finishTag(new FinishTag(new Location(pos, endToken)));

//     return new BaseBuilder(this.handler);
//   }

//   beginAttributeName(pos: Position): AttributeNameBuilder {
//     return new AttributeNameBuilder(new LocationBuilder(pos), this.handler);
//   }
// }

// class AttributeNameBuilder extends CharBuilder {
//   appendToAttributeName(pos: Position, char: string): this {
//     this.pushChar(char);
//     return this;
//   }

//   finishAttributeName(pos: Position): AttributeValueBuilder {
//     let name = new AttributeName(this.loc.end(pos).toLocation(), this.chars);
//     this.handler.attrName(name);
//     return new AttributeValueBuilder(new LocationBuilder(pos), this.handler);
//   }
// }

// class AttributeValueBuilder extends CharBuilder {

// }

// class StartTagBuilder extends TagBuilder {
//   public kind: 'start' = 'start';
// }

// class EndTagBuilder extends TagBuilder {
//   public kind: 'end' = 'end';
// }

// export class Data extends Token {
//   constructor(loc: Location, public chars: string) {
//     super(loc);
//   }
// }

// export class OpenTag extends Token {
// }

// export class FinishTag extends Token {
// }

// export class StartTag extends Token {
//   constructor(loc: Location, public name: TagName) {
//     super(loc);
//   }
// }

// export class EndTag extends Token {
//   constructor(loc: Location, public name: TagName) {
//     super(loc);
//   }
// }

// export class TagName extends Token {
//   constructor(loc: Location, public chars: string) {
//     super(loc);
//   }
// }

// export class AttributeName extends Token {
//   constructor(loc: Location, public chars: string) {
//     super(loc);
//   }
// }

// export class Events {
//   column: number = 0;
//   line: number = 1;
//   token: Option<TokenBuilder<Token>> = null;
//   delegate: Delegate;

//   constructor(delegate) {
//     this.delegate = delegate;
//   }

//   advance(char) {
//     let pos = this.pos();

//     if (char === '\n') {
//       this.line++;
//       this.column = 0;
//     } else {
//       this.column++;
//     }

//     return pos;
//   }

//   skip(count) {
//     let pos = this.pos();
//     this.column += count;
//     return pos;
//   }

//   pos() {
//     return { line: this.line, column: this.column };
//   }

//   reset() {
//   }

//   whitespace(pos: Position, char: string) {
//     this.delegate.whitespace(new Whitespace(Location.forChar(pos, char), char))
//   }

//   beginData(pos: Position) {
//     this.token = DataBuilder.withStart(pos);
//   }

//   appendToData(pos: Position, char: string) {
//     unwrap(this.token).as(DataBuilder).pushChar(char);
//   }

//   finishData() {
//     this.delegate.data(unwrap(this.token).toToken());
//     return ['finishData', this.pos()];
//   }

//   beginComment() {
//     let pos = this.advance('<');
//     this.advance('!');
//     this.advance('-');
//     this.advance('-');
//     return ['beginComment', pos];
//   }

//   appendToCommentData(char) {
//     return ['appendToCommentData', this.advance(char), char];
//   }

//   finishComment() {
//     this.advance('>');
//     return ['finishComment', this.pos()];
//   }

//   openTag(kind) {
//     let pos = this.advance('<');
//     if (kind === 'end') this.advance('/');
//     return ['openTag', pos, kind];
//   }

//   beginTagName() {
//     return ['beginTagName', this.pos()];
//   }

//   appendToTagName(char) {
//     return ['appendToTagName', this.advance(char), char];
//   }

//   finishTagName() {
//     return ['finishTagName', this.pos()];
//   }

//   finishTag(selfClosing) {
//     if (selfClosing) this.advance('/');
//     this.advance('>');
//     return ['finishTag', this.pos(), selfClosing || false];
//   }

//   beginAttributeName() {
//     return ['beginAttributeName', this.pos()];
//   }

//   appendToAttributeName(char) {
//     if (typeof char === 'string') {
//       return ['appendToAttributeName', this.advance(char), char];
//     } else {
//       return ['appendToAttributeName', this.skip(char.source.length), char];
//     }
//   }

//   finishAttributeName() {
//     return ['finishAttributeName', this.pos()];
//   }

//   beginWholeAttributeValue() {
//     return ['beginWholeAttributeValue', this.pos()];
//   }

//   beginAttributeValue(quoted) {
//     return ['beginAttributeValue', this.pos(), quoted];
//   }

//   appendToAttributeValue(char) {
//     if (typeof char === 'string') {
//       return ['appendToAttributeValue', this.advance(char), char];
//     } else {
//       return ['appendToAttributeValue', this.skip(char.source.length), char];
//     }
//   }

//   finishAttributeValue(quoted) {
//     return ['finishAttributeValue', this.pos(), quoted];
//   }

//   finishWholeAttributeValue() {
//     return ['finishWholeAttributeValue', this.pos()];
//   }

//   voidAttributeValue() {
//     return ['voidAttributeValue', this.pos()];
//   }
// }
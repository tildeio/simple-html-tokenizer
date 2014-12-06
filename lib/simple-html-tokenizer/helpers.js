export var objectCreate = Object.create || function objectCreate(obj) {
  function F() {}
  F.prototype = obj;
  return new F();
};

export function isSpace(char) {
  return (/[\t\n\f ]/).test(char);
}

export function isAlpha(char) {
  return (/[A-Za-z]/).test(char);
}

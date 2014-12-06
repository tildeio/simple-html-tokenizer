export function StartTag(tagName, attributes, selfClosing) {
  this.type = 'StartTag';
  this.tagName = tagName || '';
  this.attributes = attributes || [];
  this.selfClosing = selfClosing === true;
  this._currentAttribute = undefined;
}

StartTag.prototype = {
  addToTagName: function(char) {
    this.tagName += char;
  },

  startAttribute: function(char) {
    this._currentAttribute = [char.toLowerCase(), "", null];
    this.attributes.push(this._currentAttribute);
  },

  addToAttributeName: function(char) {
    this._currentAttribute[0] += char;
  },

  markAttributeQuoted: function(value) {
    this._currentAttribute[2] = value;
  },

  addToAttributeValue: function(char) {
    this._currentAttribute[1] = this._currentAttribute[1] || "";
    this._currentAttribute[1] += char;
  },

  finalizeAttributeValue: function() {
    if (this._currentAttribute) {
      if (this._currentAttribute[2] === null) {
        this._currentAttribute[2] = false;
      }
      this._currentAttribute = undefined;
    }
  },

  finalize: function() {
    this.finalizeAttributeValue();
    return this;
  }
};

export function EndTag(tagName) {
  this.type = 'EndTag';
  this.tagName = tagName || '';
}

EndTag.prototype = {
  addToTagName: function(char) {
    this.tagName += char;
  },
  finalize: function () {
    return this;
  }
};

export function Chars(chars) {
  this.type = 'Chars';
  this.chars = chars || "";
}

Chars.prototype = {
  addChar: function(char) {
    this.chars += char;
  }
};

export function Comment(chars) {
  this.type = 'Comment';
  this.chars = chars || '';
}

Comment.prototype = {
  addChar: function(char) {
    this.chars += char;
  },

  finalize: function() { return this; }
};

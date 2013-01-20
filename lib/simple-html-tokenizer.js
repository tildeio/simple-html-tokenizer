/*jshint boss:true*/

(function() {

objectCreate = Object.create || function(obj) {
  function F() {}
  F.prototype = obj;
  return new F();
};

function isSpace(char) {
  return (/[\n\r\t ]/).test(char);
}

function isAlpha(char) {
  return (/[A-Za-z]/).test(char);
}

function Tokenizer(input) {
  this.input = input;
  this.char = 0;
  this.state = 'data';
  this.token = null;
}

Tokenizer.prototype = {
  tokenize: function() {
    var tokens = [], token;

    while (true) {
      token = this.lex();
      if (token === 'EOF') { break; }
      if (token) { tokens.push(token); }
    }

    return tokens;
  },

  tag: function(Type, char) {
    char = char.toLowerCase();

    var lastToken = this.token;
    this.token = new Type(char);
    this.state = 'tagName';
    return lastToken;
  },

  selfClosing: function() {
    this.token.selfClosing = true;
  },

  attribute: function(char) {
    this.token.startAttribute(char);
    this.state = 'attributeName';
  },

  addToAttributeName: function(char) {
    this.token.addToAttributeName(char.toLowerCase());
  },

  addToAttributeValue: function(char) {
    this.token.addToAttributeValue(char);
  },

  emitData: function() {
    var lastToken = this.token;
    this.token = null;
    this.state = 'tagOpen';
    return lastToken;
  },

  emitTag: function() {
    var lastToken = this.token.finalize();
    this.token = null;
    this.state = 'data';
    return lastToken;
  },

  addData: function(char) {
    if (this.token === null) {
      this.token = new Chars();
    }

    this.token.addChar(char);
  },

  lex: function() {
    var char = this.input.charAt(this.char++);

    if (char) {
      console.log(this.state, char);
      return this.states[this.state].call(this, char);
    } else {
      return 'EOF';
    }
  },

  states: {
    data: function(char) {
      if (char === "<") {
        return this.emitData();
      } else {
        this.addData(char);
      }
    },

    tagOpen: function(char) {
      if (char === "/") {
        this.state = 'endTagOpen';
      } else if (!isSpace(char)) {
        return this.tag(StartTag, char);
      }
    },

    tagName: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if(/[A-Za-z]/.test(char)) {
        this.token.addToTagName(char);
      } else if (char === ">") {
        return this.emitTag();
      }
    },

    beforeAttributeName: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitTag();
      } else {
        this.attribute(char);
      }
    },

    attributeName: function(char) {
      if (isSpace(char)) {
        this.state = 'afterAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === "=") {
        this.state = 'beforeAttributeValue';
      } else if (char === ">") {
        return this.emitTag();
      } else {
        this.addToAttributeName(char);
      }
    },

    beforeAttributeValue: function(char) {
      if (isSpace(char)) {
        return;
      } else if (char === '"') {
        this.state = 'attributeValueDoubleQuoted';
      } else if (char === "'") {
        this.state = 'attributeValueSingleQuoted';
      } else if (char === ">") {
        return this.emitTag();
      } else {
        this.state = 'attributeValueUnquoted';
        this.addToAttributeValue(char);
      }
    },

    attributeValueDoubleQuoted: function(char) {
      if (char === '"') {
        this.state = 'afterAttributeValueQuoted';
      } else {
        this.addToAttributeValue(char);
      }
    },

    attributeValueSingleQuoted: function(char) {
      if (char === "'") {
        this.state = 'afterAttributeValueQuoted';
      } else {
        this.addToAttributeValue(char);
      }
    },

    attributeValueUnquoted: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === ">") {
        return this.emitTag();
      } else {
        this.addToAttributeValue(char);
      }
    },

    afterAttributeValueQuoted: function(char) {
      if (isSpace(char)) {
        this.state = 'beforeAttributeName';
      } else if (char === "/") {
        this.state = 'selfClosingStartTag';
      } else if (char === ">") {
        return this.emitTag();
      } else {
        this.char--;
        this.state = 'beforeAttributeName';
      }
    },

    selfClosingStartTag: function(char) {
      if (char === ">") {
        this.selfClosing();
        return this.emitTag();
      } else {
        this.char--;
        this.state = 'beforeAttributeName';
      }
    },

    endTagOpen: function(char) {
      if (isAlpha(char)) {
        this.tag(EndTag, char);
      }
    }
  }
};

Tokenizer.tokenize = function(input) {
  var tokenizer = new Tokenizer(input);
  return tokenizer.tokenize();
};

function Tag(tagName, attributes, options) {
  this.tagName = tagName || "";
  this.attributes = attributes || [];
  this.selfClosing = options ? options.selfClosing : false;
}

Tag.prototype = {
  addToTagName: function(char) {
    this.tagName += char;
  },

  startAttribute: function(char) {
    this.currentAttribute = [char.toLowerCase(), null];
    this.attributes.push(this.currentAttribute);
  },

  addToAttributeName: function(char) {
    this.currentAttribute[0] += char;
  },

  addToAttributeValue: function(char) {
    this.currentAttribute[1] = this.currentAttribute[1] || "";
    this.currentAttribute[1] += char;
  },

  finalize: function() {
    delete this.currentAttribute;
    return this;
  }
};

function StartTag() {
  Tag.apply(this, arguments);
}

StartTag.prototype = objectCreate(Tag.prototype);
StartTag.prototype.constructor = StartTag;

function EndTag() {
  Tag.apply(this, arguments);
}

EndTag.prototype = objectCreate(Tag.prototype);
EndTag.prototype.constructor = EndTag;

function Chars(chars) {
  this.chars = chars || "";
}

Chars.prototype = {
  addChar: function(char) {
    this.chars += char;
  }
};

window.HTML5Tokenizer = {
  tokenize: Tokenizer.tokenize,
  StartTag: StartTag,
  EndTag: EndTag,
  Chars: Chars
};

})();

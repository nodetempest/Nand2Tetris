import fs from "fs";

export class Tokenizer {
  static symbols = [
    "{",
    "}",
    "(",
    ")",
    "[",
    "]",
    ".",
    ",",
    ";",
    "+",
    "-",
    "*",
    "/",
    "&",
    "|",
    "<",
    ">",
    "=",
    "~",
  ];

  static keywords = {
    CLASS: "class",
    CONSTRUCTOR: "constructor",
    FUNCTION: "function",
    METHOD: "method",
    FIELD: "field",
    STATIC: "static",
    VAR: "var",
    INT: "int",
    CHAR: "char",
    BOOLEAN: "boolean",
    VOID: "void",
    TRUE: "true",
    FALSE: "false",
    NULL: "null",
    THIS: "this",
    LET: "let",
    DO: "do",
    IF: "if",
    ELSE: "else",
    WHILE: "while",
    RETURN: "return",
  };

  static tokenTypes = {
    KEYWORD: "keyword",
    SYMBOL: "symbol",
    INTEGER_CONSTANT: "integerConstant",
    STRING_CONSTANT: "stringConstant",
    IDENTIFIER: "identifier",
  };

  static isSymbol(value) {
    return Tokenizer.symbols.includes(value);
  }

  static isKeyword(value) {
    return Object.values(Tokenizer.keywords).includes(value);
  }

  static isStringConstant(value) {
    return value.startsWith('"') && value.endsWith('"');
  }

  static isIntegerConstant(value) {
    return !isNaN(Number(value));
  }

  static getTokenType(value) {
    return [
      [Tokenizer.isStringConstant, Tokenizer.tokenTypes.STRING_CONSTANT],
      [Tokenizer.isIntegerConstant, Tokenizer.tokenTypes.INTEGER_CONSTANT],
      [Tokenizer.isSymbol, Tokenizer.tokenTypes.SYMBOL],
      [Tokenizer.isKeyword, Tokenizer.tokenTypes.KEYWORD],
      [() => true, Tokenizer.tokenTypes.IDENTIFIER],
    ].find(([validate]) => validate(value))[1];
  }

  tokenValues = [];
  pos = 0;

  constructor(file) {
    let fileContent = fs.readFileSync(file).toString("utf-8");

    // clear comments
    fileContent = fileContent.replace(/(\/\/.*)|(\/\*[\s\S]*?\*\/)/g, "");

    this.tokenValues = fileContent.match(
      /".*"|[{}()\[\]\.,;+\-\*\/&|<>=~]|\b[_a-zA-Z]\w*|\d+/g
    );
  }

  advance() {
    this.pos++;
  }

  hasMoreTokens() {
    return this.pos < this.tokenValues.length;
  }

  getToken() {
    if (!this.hasMoreTokens()) {
      return null;
    } else {
      let tokenValue = this.tokenValues[this.pos];
      const tokenType = Tokenizer.getTokenType(tokenValue);

      // '"hello"' --> 'hello'
      if (tokenType === Tokenizer.tokenTypes.STRING_CONSTANT) {
        tokenValue = tokenValue.slice(1, -1);
      }

      return {
        value: tokenValue,
        type: tokenType,
      };
    }
  }
}

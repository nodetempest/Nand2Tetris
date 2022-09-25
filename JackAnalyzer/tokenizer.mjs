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
    class: "class",
    constructor: "constructor",
    function: "function",
    method: "method",
    field: "field",
    static: "static",
    var: "var",
    int: "int",
    char: "char",
    boolean: "boolean",
    void: "void",
    true: "true",
    false: "false",
    null: "null",
    this: "this",
    let: "let",
    do: "do",
    if: "if",
    else: "else",
    while: "while",
    return: "return",
  };

  static tokenTypes = {
    keyword: "keyword",
    symbol: "symbol",
    integerConstant: "integerConstant",
    stringConstant: "stringConstant",
    identifier: "identifier",
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
      [Tokenizer.isStringConstant, Tokenizer.tokenTypes.stringConstant],
      [Tokenizer.isIntegerConstant, Tokenizer.tokenTypes.integerConstant],
      [Tokenizer.isSymbol, Tokenizer.tokenTypes.symbol],
      [Tokenizer.isKeyword, Tokenizer.tokenTypes.keyword],
      [() => true, Tokenizer.tokenTypes.identifier],
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
      if (tokenType === Tokenizer.tokenTypes.stringConstant) {
        tokenValue = tokenValue.slice(1, -1);
      }

      return {
        value: tokenValue,
        type: tokenType,
      };
    }
  }
}

import { FIFOBuffer } from "./FIFOBuffer.mjs";
import { isWhitespace } from "./utils.mjs";

export class Tokenizer {
  static symbols = [
    "{",
    "}",
    "(",
    ")",
    "[",
    "]",
    ".",
    ".",
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

  static keywords = [
    "class",
    "constructor",
    "function",
    "method",
    "field",
    "static",
    "var",
    "int",
    "char",
    "boolean",
    "void",
    "true",
    "false",
    "null",
    "this",
    "let",
    "do",
    "if",
    "else",
    "while",
    "return",
  ];

  static tokenTypes = {
    keyword: "keyword",
    symbol: "symbol",
    integerConstant: "integerConstant",
    stringConstant: "stringConstant",
    identifier: "identifier",
  };

  static isSymbol(char) {
    return Tokenizer.symbols.some((symbol) => symbol === char);
  }

  input;
  token = {
    type: null,
    value: null,
  };
  lookaheadChar = "";

  constructor(input) {
    this.input = input;
  }

  advance() {
    let char = "";
    let stopIgnoreInput = false;

    // ignore input until meet something other than whitespace or comment
    while (!stopIgnoreInput) {
      do {
        char = this.input.getChar();
      } while (isWhitespace(char));

      // division "/" or comment "//"
      if (char === "/") {
        this.lookaheadChar = this.input.getChar();

        // TODO: handle division
        const isComment =
          this.lookaheadChar === "/" || this.lookaheadChar === "*";

        if (this.lookaheadChar === "/") {
          this.ignoreInputUntil((buffer) => buffer.toString() !== "\r\n");
        } else if (this.lookaheadChar === "*") {
          this.ignoreInputUntil((buffer) => buffer.toString() !== "*/");
        }
      } else {
        stopIgnoreInput = true;
      }
    }

    if (Tokenizer.isSymbol(char)) {
      this.token = {
        type: Tokenizer.tokenTypes.symbol,
        value: char,
      };
    }
  }

  ignoreInputUntil(fn) {
    const buffer = new FIFOBuffer(2);
    do {
      const ignoreChar = this.input.getChar();
      buffer.push(ignoreChar);
    } while (fn(buffer));
  }

  getToken() {
    return { ...this.token };
  }
}

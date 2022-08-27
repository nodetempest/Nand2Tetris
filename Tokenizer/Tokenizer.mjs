import { CharBuffer } from "./CharBuffer.mjs";
import { isWhitespace } from "./utils.mjs";

export class Tokenizer {
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
          this.ignoreInputUntil((buffer) => buffer.getValue() !== "\r\n");
        } else if (this.lookaheadChar === "*") {
          this.ignoreInputUntil((buffer) => buffer.getValue() !== "*/");
        }
      } else {
        stopIgnoreInput = true;
      }
    }

    console.log(char);
  }

  ignoreInputUntil(fn) {
    const buffer = new CharBuffer(2);
    do {
      const ignoreChar = this.input.getChar();
      buffer.push(ignoreChar);
    } while (fn(buffer));
  }

  getToken() {
    return this.token;
  }
}

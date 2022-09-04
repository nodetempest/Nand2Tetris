import xml2js from "xml2js";
import fs from "fs";

import { Tokenizer } from "./Tokenizer.mjs";

export class CompilationEngine {
  tree = { class: [] };
  currentRoot = this.tree.class;
  tokenizer;

  constructor(inputFile, outputFile) {
    this.tokenizer = new Tokenizer(inputFile);
    this.compileClass();

    const xmlBuilder = new xml2js.Builder({ headless: true });
    const xml = xmlBuilder.buildObject(this.tree);

    fs.writeFileSync(outputFile, xml + "\r\n");
  }

  compileClass() {
    this.eat("class");
    this.eat(this.tokenizer.getToken().value);
    this.eat("{");
    this.eat("}");
    this.eat(null);
  }

  eat(tokenValue) {
    const currentToken = this.tokenizer.getToken();

    if (tokenValue === null && currentToken === null) {
      return;
    } else if (tokenValue === null && this.tokenizer.hasMoreTokens()) {
      throw new Error(
        `Expected EOF but recieved token: "${currentToken.value}", ${currentToken.type}`
      );
    }

    if (currentToken.value !== tokenValue) {
      throw new Error(`Invalid token: "${currentToken.value}"`);
    } else {
      this.currentRoot.push({ [currentToken.type]: currentToken.value });
      this.tokenizer.advance();
    }
  }
}

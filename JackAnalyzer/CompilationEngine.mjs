import xml2js from "xml2js";
import fs from "fs";

import { Tokenizer } from "./Tokenizer.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { last } from "./utils.mjs";

export class CompilationEngine {
  static classVarDecKeywords = ["static", "field"];
  static subroutineDecKeywords = ["constructor", "function", "method"];

  tree = { class: [] };
  nodes = [this.tree.class];
  tokenizer;

  constructor(inputFile, outputFile) {
    this.tokenizer = new Tokenizer(inputFile);
    this.compileClass();

    const xmlBuilder = new xml2js.Builder({
      headless: true,
      renderOpts: {
        pretty: true,
        indent: "  ",
        newline: "\r\n",
        allowEmpty: true,
      },
    });
    const xml = xmlBuilder.buildObject(this.tree);

    fs.writeFileSync(outputFile, xml + "\r\n");
  }

  eat(tokenValue) {
    const currentToken = this.tokenizer.getToken();

    if (tokenValue === null && currentToken === null) {
      return;
    } else if (tokenValue === null && this.tokenizer.hasMoreTokens()) {
      throw new CompilationEngineError(
        `Expected EOF but recieved token: ${currentToken.value}, ${currentToken.type}`
      );
    }

    if (currentToken.value !== tokenValue) {
      throw new CompilationEngineError(`Invalid token: ${currentToken.value}`);
    } else {
      this.getCurrentNode().push({ [currentToken.type]: currentToken.value });
      this.tokenizer.advance();
    }
  }

  getCurrentNode() {
    return last(this.nodes);
  }

  createAndSetNode(tokenType) {
    const leaves = [];
    const node = { [tokenType]: leaves };
    this.getCurrentNode().push(node);
    this.nodes.push(leaves);
  }

  backToParentNode() {
    this.nodes.pop();
  }

  compileClass() {
    this.eat("class");
    this.eat(this.tokenizer.getToken().value);
    this.eat("{");

    while (
      CompilationEngine.classVarDecKeywords
        .concat(CompilationEngine.subroutineDecKeywords)
        .includes(this.tokenizer.getToken().value)
    ) {
      if (
        CompilationEngine.classVarDecKeywords.includes(
          this.tokenizer.getToken().value
        )
      ) {
        this.compileClassVarDec();
      } else if (
        CompilationEngine.subroutineDecKeywords.includes(
          this.tokenizer.getToken().value
        )
      ) {
        this.compileSubroutineDec();
      }
    }

    this.eat("}");
    this.eat(null);
  }

  compileClassVarDec() {
    this.createAndSetNode("classVarDec");
    this.eat(this.tokenizer.getToken().value);
    this.eat(this.tokenizer.getToken().value);
    this.eat(this.tokenizer.getToken().value);

    while (this.tokenizer.getToken().value === ",") {
      this.eat(",");
      this.eat(this.tokenizer.getToken().value);
    }

    this.eat(";");
    this.backToParentNode();
  }

  compileSubroutineDec() {
    this.createAndSetNode("subroutineDec");
    this.eat(this.tokenizer.getToken().value);
    this.eat(this.tokenizer.getToken().value);
    this.eat(this.tokenizer.getToken().value);
    this.eat("(");
    this.complieParameterList();
    this.eat(")");
    this.eat("{");
    this.complieSubroutineBody();
    this.eat("}");
    this.backToParentNode();
  }

  complieParameterList() {
    this.createAndSetNode("parameterList");

    const isEmpty = this.tokenizer.getToken().value === ")";

    if (!isEmpty) {
      this.eat(this.tokenizer.getToken().value);
      this.eat(this.tokenizer.getToken().value);

      while (this.tokenizer.getToken().value === ",") {
        this.eat(",");
        this.eat(this.tokenizer.getToken().value);
        this.eat(this.tokenizer.getToken().value);
      }
    }

    return this.backToParentNode();
  }

  complieSubroutineBody() {
    this.createAndSetNode("subroutineBody");
    this.backToParentNode();
  }
}

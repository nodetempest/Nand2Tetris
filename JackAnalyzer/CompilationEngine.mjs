import xml2js from "xml2js";
import fs from "fs";

import { Tokenizer } from "./Tokenizer.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { last } from "./utils.mjs";

export class CompilationEngine {
  static classVarDecKeywords = ["static", "field"];
  static subroutineDecKeywords = ["constructor", "function", "method"];
  static statementKeywords = ["let", "if", "while", "do", "return"];

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

    fs.writeFileSync(outputFile, xml);
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
      this.getCurrentNode().push({
        [currentToken.type]: ` ${currentToken.value} `,
      });
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
    this.complieSubroutineBody();
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
    this.eat("{");

    while (this.tokenizer.getToken().value === "var") {
      this.compileVarDec();
    }

    this.compileStatements();

    this.eat("}");
    this.backToParentNode();
  }

  compileVarDec() {
    this.createAndSetNode("varDec");
    this.eat("var");
    this.eat(this.tokenizer.getToken().value);
    this.eat(this.tokenizer.getToken().value);
    this.eat(";");
    this.backToParentNode();
  }

  compileStatements() {
    this.createAndSetNode("statements");

    while (
      CompilationEngine.statementKeywords.includes(
        this.tokenizer.getToken().value
      )
    ) {
      const tokenValue = this.tokenizer.getToken().value;

      if (tokenValue === "let") {
        this.compileLet();
      } else if (tokenValue === "if") {
        this.compileIf();
      } else if (tokenValue === "while") {
        this.compileWhile();
      } else if (tokenValue === "do") {
        this.compileDo();
      } else if (tokenValue === "return") {
        this.compileReturn();
      }
    }

    this.backToParentNode();
  }

  compileLet() {
    this.createAndSetNode("letStatement");
    this.eat("let");
    this.eat(this.tokenizer.getToken().value);

    if (this.tokenizer.getToken().value === "[") {
      this.eat("[");
      this.compileExpression();
      this.eat("]");
    }

    this.eat("=");
    this.compileExpression();
    this.eat(";");
    this.backToParentNode();
  }

  compileIf() {
    this.createAndSetNode("ifStatement");
    this.eat("if");
    this.eat("(");
    this.compileExpression();
    this.eat(")");
    this.eat("{");
    this.compileStatements();
    this.eat("}");

    if (this.tokenizer.getToken().value === "else") {
      this.eat("else");
      this.eat("{");
      this.compileStatements();
      this.eat("}");
    }

    this.backToParentNode();
  }

  compileWhile() {
    this.createAndSetNode("whileStatement");
    this.eat("while");
    this.eat("(");
    this.compileExpression();
    this.eat(")");
    this.eat("{");
    this.compileStatements();
    this.eat("}");
    this.backToParentNode();
  }

  compileDo() {
    this.createAndSetNode("doStatement");
    this.eat("do");
    this.eat(this.tokenizer.getToken().value);

    if (this.tokenizer.getToken().value === ".") {
      this.eat(".");
      this.eat(this.tokenizer.getToken().value);
    }

    this.eat("(");
    this.compileExpressionList();
    this.eat(")");
    this.eat(";");
    this.backToParentNode();
  }

  compileReturn() {
    this.createAndSetNode("returnStatement");
    this.eat("return");

    if (this.tokenizer.getToken().value !== ";") {
      this.compileExpression();
    }

    this.eat(";");
    this.backToParentNode();
  }

  compileExpression() {
    this.createAndSetNode("expression");
    this.compileTerm();
    this.backToParentNode();
  }

  compileTerm() {
    this.createAndSetNode("term");
    this.eat(this.tokenizer.getToken().value);
    this.backToParentNode();
  }

  compileExpressionList() {
    this.createAndSetNode("expressionList");

    if (this.tokenizer.getToken().value === ")") {
      return this.backToParentNode();
    }

    this.compileExpression();

    while (this.tokenizer.getToken().value === ",") {
      this.eat(",");
      this.compileExpression();
    }

    this.backToParentNode();
  }
}

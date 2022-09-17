import { Tokenizer } from "./Tokenizer.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { last } from "./utils.mjs";

export class CompilationEngine {
  static classVarDecKeywords = ["static", "field"];
  static subroutineDecKeywords = ["constructor", "function", "method"];
  static statementKeywords = ["let", "if", "while", "do", "return"];
  static op = ["+", "-", "*", "/", "&", "|", ">", "<", "="];
  static unaryOp = ["~", "-"];
  static keywordConstant = ["true", "false", "null", "this"];

  tree = { class: [] };
  nodes = [this.tree.class];
  tokenizer;

  constructor(inputFile) {
    this.tokenizer = new Tokenizer(inputFile);
  }

  compile() {
    this.compileClass();
    return this.tree;
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
      CompilationEngine.classVarDecKeywords.includes(
        this.tokenizer.getToken().value
      )
    ) {
      this.compileClassVarDec();
    }

    while (
      CompilationEngine.subroutineDecKeywords.includes(
        this.tokenizer.getToken().value
      )
    ) {
      this.compileSubroutineDec();
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

    while (this.tokenizer.getToken().value === ",") {
      this.eat(",");
      this.eat(this.tokenizer.getToken().value);
    }

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

    if (CompilationEngine.op.includes(this.tokenizer.getToken().value)) {
      this.eat(this.tokenizer.getToken().value);
      this.compileTerm();
    }

    this.backToParentNode();
  }

  compileTerm() {
    this.createAndSetNode("term");

    if (this.tokenizer.getToken().value === "(") {
      this.eat("(");
      this.compileExpression();
      this.eat(")");
      this.backToParentNode();
      return;
    }

    if (CompilationEngine.unaryOp.includes(this.tokenizer.getToken().value)) {
      this.eat(this.tokenizer.getToken().value);
      this.compileTerm();
      this.backToParentNode();
      return;
    }

    this.eat(this.tokenizer.getToken().value);

    if (this.tokenizer.getToken().value === "(") {
      this.eat("(");
      this.compileExpressionList();
      this.eat(")");
    } else if (this.tokenizer.getToken().value === "[") {
      this.eat("[");
      this.compileExpression();
      this.eat("]");
    } else if (this.tokenizer.getToken().value === ".") {
      this.eat(".");
      this.eat(this.tokenizer.getToken().value);
      this.eat("(");
      this.compileExpressionList();
      this.eat(")");
    }

    this.backToParentNode();
  }

  compileExpressionList() {
    this.createAndSetNode("expressionList");

    if (this.tokenizer.getToken().value === ")") {
      this.backToParentNode();
      return;
    }

    this.compileExpression();

    while (this.tokenizer.getToken().value === ",") {
      this.eat(",");
      this.compileExpression();
    }

    this.backToParentNode();
  }
}

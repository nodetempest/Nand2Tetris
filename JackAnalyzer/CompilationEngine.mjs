import { Tokenizer } from "./Tokenizer.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { last } from "./utils.mjs";

export class CompilationEngine {
  static classVarDecKeywords = {
    static: Tokenizer.keywords.static,
    field: Tokenizer.keywords.field,
  };
  static subroutineDecKeywords = {
    constructor: Tokenizer.keywords.constructor,
    function: Tokenizer.keywords.function,
    method: Tokenizer.keywords.method,
  };
  static statementKeywords = {
    let: Tokenizer.keywords.let,
    if: Tokenizer.keywords.if,
    else: Tokenizer.keywords.else,
    while: Tokenizer.keywords.while,
    do: Tokenizer.keywords.do,
    return: Tokenizer.keywords.return,
  };
  static op = ["+", "-", "*", "/", "&", "|", ">", "<", "="];
  static unaryOp = ["~", "-"];
  static keywordConstant = {
    true: Tokenizer.keywords.true,
    false: Tokenizer.keywords.false,
    null: Tokenizer.keywords.null,
    this: Tokenizer.keywords.this,
  };
  static nonTerminalKeywords = {
    class: "class",
    classVarDec: "classVarDec",
    subroutineDec: "subroutineDec",
    parameterList: "parameterList",
    subroutineBody: "subroutineBody",
    varDec: "varDec",
    statements: "statements",
    letStatement: "letStatement",
    ifStatement: "ifStatement",
    whileStatement: "whileStatement",
    doStatement: "doStatement",
    returnStatement: "returnStatement",
    expression: "expression",
    term: "term",
    expressionList: "expressionList",
  };

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
    this.eat(CompilationEngine.nonTerminalKeywords.class);
    this.eat(this.tokenizer.getToken().value);
    this.eat("{");

    while (
      Object.values(CompilationEngine.classVarDecKeywords).includes(
        this.tokenizer.getToken().value
      )
    ) {
      this.compileClassVarDec();
    }

    while (
      Object.values(CompilationEngine.subroutineDecKeywords).includes(
        this.tokenizer.getToken().value
      )
    ) {
      this.compileSubroutineDec();
    }

    this.eat("}");
    this.eat(null);
  }

  compileClassVarDec() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.classVarDec);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.subroutineDec);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.parameterList);

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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.subroutineBody);
    this.eat("{");

    while (this.tokenizer.getToken().value === "var") {
      this.compileVarDec();
    }

    this.compileStatements();

    this.eat("}");
    this.backToParentNode();
  }

  compileVarDec() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.varDec);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.statements);

    while (
      Object.values(CompilationEngine.statementKeywords).includes(
        this.tokenizer.getToken().value
      )
    ) {
      const tokenValue = this.tokenizer.getToken().value;

      if (tokenValue === CompilationEngine.statementKeywords.let) {
        this.compileLet();
      } else if (tokenValue === CompilationEngine.statementKeywords.if) {
        this.compileIf();
      } else if (tokenValue === CompilationEngine.statementKeywords.while) {
        this.compileWhile();
      } else if (tokenValue === CompilationEngine.statementKeywords.do) {
        this.compileDo();
      } else if (tokenValue === CompilationEngine.statementKeywords.return) {
        this.compileReturn();
      }
    }

    this.backToParentNode();
  }

  compileLet() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.letStatement);
    this.eat(CompilationEngine.statementKeywords.let);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.ifStatement);
    this.eat(CompilationEngine.statementKeywords.if);
    this.eat("(");
    this.compileExpression();
    this.eat(")");
    this.eat("{");
    this.compileStatements();
    this.eat("}");

    if (
      this.tokenizer.getToken().value ===
      CompilationEngine.statementKeywords.else
    ) {
      this.eat(CompilationEngine.statementKeywords.else);
      this.eat("{");
      this.compileStatements();
      this.eat("}");
    }

    this.backToParentNode();
  }

  compileWhile() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.whileStatement);
    this.eat(CompilationEngine.statementKeywords.while);
    this.eat("(");
    this.compileExpression();
    this.eat(")");
    this.eat("{");
    this.compileStatements();
    this.eat("}");
    this.backToParentNode();
  }

  compileDo() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.doStatement);
    this.eat(CompilationEngine.statementKeywords.do);
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
    this.createAndSetNode(
      CompilationEngine.nonTerminalKeywords.returnStatement
    );
    this.eat(CompilationEngine.statementKeywords.return);

    if (this.tokenizer.getToken().value !== ";") {
      this.compileExpression();
    }

    this.eat(";");
    this.backToParentNode();
  }

  compileExpression() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.expression);
    this.compileTerm();

    while (CompilationEngine.op.includes(this.tokenizer.getToken().value)) {
      this.eat(this.tokenizer.getToken().value);
      this.compileTerm();
    }

    this.backToParentNode();
  }

  compileTerm() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.term);

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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.expressionList);

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

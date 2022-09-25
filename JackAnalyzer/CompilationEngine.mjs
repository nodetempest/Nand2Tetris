import { Tokenizer } from "./Tokenizer.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { last } from "./utils.mjs";

export class CompilationEngine {
  static classVarDecKeywords = {
    STATIC: Tokenizer.keywords.STATIC,
    FIELD: Tokenizer.keywords.FIELD,
  };
  static subroutineDecKeywords = {
    CONSTRUCTOR: Tokenizer.keywords.CONSTRUCTOR,
    FUNCTION: Tokenizer.keywords.FUNCTION,
    METHOD: Tokenizer.keywords.METHOD,
  };
  static statementKeywords = {
    LET: Tokenizer.keywords.LET,
    IF: Tokenizer.keywords.IF,
    ELSE: Tokenizer.keywords.ELSE,
    WHILE: Tokenizer.keywords.WHILE,
    DO: Tokenizer.keywords.DO,
    RETURN: Tokenizer.keywords.RETURN,
  };
  static op = ["+", "-", "*", "/", "&", "|", ">", "<", "="];
  static unaryOp = ["~", "-"];
  static keywordConstant = {
    TRUE: Tokenizer.keywords.TRUE,
    FALSE: Tokenizer.keywords.FALSE,
    NULL: Tokenizer.keywords.NULL,
    THIS: Tokenizer.keywords.THIS,
  };
  static nonTerminalKeywords = {
    CLASS: "class",
    CLASS_VAR_DEC: "classVarDec",
    SUBROUTINE_DEC: "subroutineDec",
    PARAMETER_LIST: "parameterList",
    SUBROUTINE_BODY: "subroutineBody",
    VAR_DEC: "varDec",
    STATEMENTS: "statements",
    LET_STATEMENT: "letStatement",
    IF_STATEMENT: "ifStatement",
    WHILE_STATEMENT: "whileStatement",
    DO_STATEMENT: "doStatement",
    RETURN_STATEMENT: "returnStatement",
    EXPRESSION: "expression",
    TERM: "term",
    EXPRESSION_LIST: "expressionList",
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
    this.eat(CompilationEngine.nonTerminalKeywords.CLASS);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.CLASS_VAR_DEC);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.SUBROUTINE_DEC);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.PARAMETER_LIST);

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
    this.createAndSetNode(
      CompilationEngine.nonTerminalKeywords.SUBROUTINE_BODY
    );
    this.eat("{");

    while (this.tokenizer.getToken().value === "var") {
      this.compileVarDec();
    }

    this.compileStatements();

    this.eat("}");
    this.backToParentNode();
  }

  compileVarDec() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.VAR_DEC);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.STATEMENTS);

    while (
      Object.values(CompilationEngine.statementKeywords).includes(
        this.tokenizer.getToken().value
      )
    ) {
      const tokenValue = this.tokenizer.getToken().value;

      if (tokenValue === CompilationEngine.statementKeywords.LET) {
        this.compileLet();
      } else if (tokenValue === CompilationEngine.statementKeywords.IF) {
        this.compileIf();
      } else if (tokenValue === CompilationEngine.statementKeywords.WHILE) {
        this.compileWhile();
      } else if (tokenValue === CompilationEngine.statementKeywords.DO) {
        this.compileDo();
      } else if (tokenValue === CompilationEngine.statementKeywords.RETURN) {
        this.compileReturn();
      }
    }

    this.backToParentNode();
  }

  compileLet() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.LET_STATEMENT);
    this.eat(CompilationEngine.statementKeywords.LET);
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
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.IF_STATEMENT);
    this.eat(CompilationEngine.statementKeywords.IF);
    this.eat("(");
    this.compileExpression();
    this.eat(")");
    this.eat("{");
    this.compileStatements();
    this.eat("}");

    if (
      this.tokenizer.getToken().value ===
      CompilationEngine.statementKeywords.ELSE
    ) {
      this.eat(CompilationEngine.statementKeywords.ELSE);
      this.eat("{");
      this.compileStatements();
      this.eat("}");
    }

    this.backToParentNode();
  }

  compileWhile() {
    this.createAndSetNode(
      CompilationEngine.nonTerminalKeywords.WHILE_STATEMENT
    );
    this.eat(CompilationEngine.statementKeywords.WHILE);
    this.eat("(");
    this.compileExpression();
    this.eat(")");
    this.eat("{");
    this.compileStatements();
    this.eat("}");
    this.backToParentNode();
  }

  compileDo() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.DO_STATEMENT);
    this.eat(CompilationEngine.statementKeywords.DO);
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
      CompilationEngine.nonTerminalKeywords.RETURN_STATEMENT
    );
    this.eat(CompilationEngine.statementKeywords.RETURN);

    if (this.tokenizer.getToken().value !== ";") {
      this.compileExpression();
    }

    this.eat(";");
    this.backToParentNode();
  }

  compileExpression() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.EXPRESSION);
    this.compileTerm();

    while (CompilationEngine.op.includes(this.tokenizer.getToken().value)) {
      this.eat(this.tokenizer.getToken().value);
      this.compileTerm();
    }

    this.backToParentNode();
  }

  compileTerm() {
    this.createAndSetNode(CompilationEngine.nonTerminalKeywords.TERM);

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
    this.createAndSetNode(
      CompilationEngine.nonTerminalKeywords.EXPRESSION_LIST
    );

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

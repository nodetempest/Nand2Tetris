import fs from "fs";

import { SymbolTable } from "./SymbolTable.mjs";
import { NLRTreeBrowser } from "./NLRTreeBrowser.mjs";
import { VMWriter } from "./VMWriter.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { format, genId } from "./utils.mjs";
import { CompilationEngine as Analizer } from "../JackAnalyzer/CompilationEngine.mjs";
import { Tokenizer } from "../JackAnalyzer/Tokenizer.mjs";

export class CompilationEngine {
  classSymbolTable = new SymbolTable();
  subroutineSymbolTable = new SymbolTable();

  className = "Main";

  currentSubroutine = {
    kind: Analizer.subroutineDecKeywords.FUNCTION,
    returnType: "void",
    name: "main",
  };

  constructor(inputFile, outputFile) {
    this.writer = new VMWriter(outputFile);

    const analizer = new Analizer(inputFile);
    const analizerTree = analizer.compile();
    this.treeBrowser = new NLRTreeBrowser(analizerTree);

    // " tokenvalue " --> "tokenvalue"
    // can't use trim because of space symbol "   "
    this.treeBrowser.mapValues((value) =>
      typeof value === "string" ? value.slice(1, -1) : value
    );

    this.compileClass();
  }

  // Assertion functions

  eatKey(key) {
    const currentNodeKey = this.treeBrowser.getCurrentNodeKey();

    if (key === null && currentNodeKey === null) {
      return;
    } else if (key === null && this.treeBrowser.hasMoreNodes()) {
      throw new CompilationEngineError(
        [
          `Expected EOF but recieved node type: '${currentNodeKey}'`,
          `expected: '${key}'`,
          `at node: ${format(this.treeBrowser.getCurrentNode())}`,
        ].join("\r\n")
      );
    }

    if (currentNodeKey !== key) {
      throw new CompilationEngineError(
        [
          `Invalid node type: '${currentNodeKey}'`,
          `expected: '${key}'`,
          `at node: ${format(this.treeBrowser.getCurrentNode())}`,
        ].join("\r\n")
      );
    } else {
      this.treeBrowser.advance();
    }
  }

  eatValue(value) {
    const currentNodeValue = this.treeBrowser.getCurrentNodeValue();

    if (currentNodeValue !== value) {
      throw new CompilationEngineError(
        [
          `Invalid node value: ${format(currentNodeValue)}`,
          `expected: '${value}'`,
          `at node: ${format(this.treeBrowser.getCurrentNode())}`,
        ].join("\r\n")
      );
    } else {
      this.treeBrowser.advance();
    }
  }

  // Read helpers

  readValue() {
    const value = this.treeBrowser.getCurrentNodeValue();
    this.treeBrowser.advance();
    return value;
  }

  readKey() {
    const key = this.treeBrowser.getCurrentNodeKey();
    this.treeBrowser.advance();
    return key;
  }

  // Subroutine helper

  setCurrentSubroutine(name, returnType, kind) {
    this.currentSubroutine = {
      name,
      returnType,
      kind,
    };
  }

  // Symbol table helpers

  varExists(varName) {
    return (
      this.subroutineSymbolTable.hasVar(varName) ||
      this.classSymbolTable.hasVar(varName)
    );
  }

  lookupVar(varName) {
    if (!this.varExists(varName)) {
      return;
    }

    const table = this.subroutineSymbolTable.hasVar(varName)
      ? this.subroutineSymbolTable
      : this.classSymbolTable;

    let segment = table.kindOf(varName);
    if (segment === SymbolTable.kind.FIELD) {
      segment = VMWriter.segment.THIS;
    }

    const type = table.typeOf(varName);
    const index = table.indexOf(varName);

    return { segment, type, index };
  }

  // Write helpers

  writePushVar(varName) {
    if (!this.varExists(varName)) {
      return;
    }

    const { segment, index } = this.lookupVar(varName);
    this.writer.writePush(segment, index);
  }

  writePopVar(varName) {
    if (!this.varExists(varName)) {
      return;
    }

    const { segment, index } = this.lookupVar(varName);
    this.writer.writePop(segment, index);
  }

  writeOp(op) {
    const opMap = {
      "+": VMWriter.commands.ADD,
      "-": VMWriter.commands.SUB,
      "=": VMWriter.commands.EQ,
      ">": VMWriter.commands.GT,
      "<": VMWriter.commands.LT,
      "&": VMWriter.commands.AND,
      "|": VMWriter.commands.OR,
      "+": VMWriter.commands.ADD,
    };

    if (op in opMap) {
      this.writer.writeArithmetic(opMap[op]);
    } else if (op === "*") {
      this.writer.writeCall("Math.multiply", 2);
    } else if (op === "/") {
      this.writer.writeCall("Math.divide", 2);
    }
  }

  writeUnaryOp(op) {
    const opMap = {
      "-": VMWriter.commands.NEG,
      "~": VMWriter.commands.NOT,
    };

    if (op in opMap) {
      this.writer.writeArithmetic(opMap[op]);
    }
  }

  // Compile functions

  // Example:
  // class Point {...}
  compileClass() {
    this.eatKey(Analizer.nonTerminalKeywords.CLASS);

    this.eatValue(Tokenizer.keywords.CLASS);
    this.className = this.readValue();

    this.eatValue("{");

    while (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.CLASS_VAR_DEC
    ) {
      this.compileClassVarDec();
    }

    while (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.SUBROUTINE_DEC
    ) {
      this.compileSubroutineDec();
    }

    this.eatValue("}");
    this.eatKey(null);
  }

  // Example:
  // field int x, y;
  // static Car myCar;
  compileClassVarDec() {
    this.eatKey(Analizer.nonTerminalKeywords.CLASS_VAR_DEC);

    const kind = this.readValue();
    const type = this.readValue();
    const name = this.readValue();

    this.classSymbolTable.define(name, type, kind);

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.eatValue(",");

      const name = this.readValue();
      this.classSymbolTable.define(name, type, kind);
    }
    this.eatValue(";");
  }

  // Example:
  // method void print () {...}
  // function int getWordsCount (string input, boolean includeSymbols) {...}
  compileSubroutineDec() {
    this.eatKey(Analizer.nonTerminalKeywords.SUBROUTINE_DEC);
    this.subroutineSymbolTable.startSubroutine();

    const kind = this.readValue();
    const returnType = this.readValue();
    const name = this.readValue();

    this.setCurrentSubroutine(name, returnType, kind);
    this.eatValue("(");
    this.complieParameterList();
    this.eatValue(")");
    this.complieSubroutineBody();
  }

  // Example:
  // suppose function: method void showPoint (int x, int y) {...}
  // then list is: int x, int y
  complieParameterList() {
    if (this.currentSubroutine.kind === Analizer.subroutineDecKeywords.METHOD) {
      this.subroutineSymbolTable.define(
        Analizer.keywordConstant.THIS,
        this.className,
        SymbolTable.kind.ARGUMENT
      );
    }

    const paramListIsEmpty = !this.treeBrowser.getCurrentNodeValue().length;

    this.eatKey(Analizer.nonTerminalKeywords.PARAMETER_LIST);

    if (paramListIsEmpty) {
      return;
    }

    const type = this.readValue();
    const name = this.readValue();
    this.subroutineSymbolTable.define(name, type, SymbolTable.kind.ARGUMENT);

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.eatValue(",");
      const type = this.readValue();
      const name = this.readValue();
      this.subroutineSymbolTable.define(name, type, SymbolTable.kind.ARGUMENT);
    }
  }

  // Example:
  // suppose function: method void showPoint (int x, int y) {...}
  // then body is: {...}
  complieSubroutineBody() {
    const { name, kind } = this.currentSubroutine;

    this.eatKey(Analizer.nonTerminalKeywords.SUBROUTINE_BODY);
    this.eatValue("{");

    while (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.VAR_DEC
    ) {
      this.compileVarDec();
    }

    const fnName = [this.className, name].join(".");
    const nLocals = this.subroutineSymbolTable.varCount(SymbolTable.kind.LOCAL);

    this.writer.wrtieFunction(fnName, nLocals);

    if (kind === Analizer.subroutineDecKeywords.CONSTRUCTOR) {
      const nFields = this.classSymbolTable.varCount(SymbolTable.kind.FIELD);
      this.writer.writePush(VMWriter.segment.CONSTANT, nFields);
      this.writer.writeCall("Memory.alloc", 1);
      this.writer.writePop(VMWriter.segment.POINTER, 0);
    } else if (kind === Analizer.subroutineDecKeywords.METHOD) {
      this.writer.writePush(VMWriter.segment.ARGUMENT, 0);
      this.writer.writePop(VMWriter.segment.POINTER, 0);
    }

    this.compileStatements();

    this.eatValue("}");
  }

  // Example
  // var int x, y;
  // var Point p;
  compileVarDec() {
    this.eatKey(Analizer.nonTerminalKeywords.VAR_DEC);

    this.eatValue(Tokenizer.keywords.VAR);
    const kind = SymbolTable.kind.LOCAL;
    const type = this.readValue();
    const name = this.readValue();

    this.subroutineSymbolTable.define(name, type, kind);

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.eatValue(",");
      const name = this.readValue();
      this.subroutineSymbolTable.define(name, type, kind);
    }

    this.eatValue(";");
  }

  // Example:
  // method void show () { <statements> }
  // if (<expression>) { <statements> }
  // while (<expression>) { statements> }
  compileStatements() {
    this.eatKey(Analizer.nonTerminalKeywords.STATEMENTS);

    while (
      [
        Analizer.nonTerminalKeywords.RETURN_STATEMENT,
        Analizer.nonTerminalKeywords.LET_STATEMENT,
        Analizer.nonTerminalKeywords.IF_STATEMENT,
        Analizer.nonTerminalKeywords.WHILE_STATEMENT,
        Analizer.nonTerminalKeywords.DO_STATEMENT,
      ].includes(this.treeBrowser.getCurrentNodeKey())
    ) {
      if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.RETURN_STATEMENT
      ) {
        this.compileReturn();
      } else if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.LET_STATEMENT
      ) {
        this.compileLet();
      } else if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.IF_STATEMENT
      ) {
        this.compileIf();
      } else if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.WHILE_STATEMENT
      ) {
        this.compileWhile();
      } else if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.DO_STATEMENT
      ) {
        this.compileDo();
      }
    }
  }

  // Example:
  // let x = 5;
  // let p = Point.new(2, 3);
  compileLet() {
    this.eatKey(Analizer.nonTerminalKeywords.LET_STATEMENT);
    this.eatValue(Analizer.statementKeywords.LET);
    const varName = this.readValue();

    const isArrayIndexAssignment =
      this.treeBrowser.getCurrentNodeValue() === "[";

    if (isArrayIndexAssignment) {
      this.eatValue("[");
      this.compileExpression();
      this.eatValue("]");
      this.writePushVar(varName);
      this.writer.writeArithmetic(VMWriter.commands.ADD);
    }

    this.eatValue("=");
    this.compileExpression();

    if (isArrayIndexAssignment) {
      this.writer.writePop(VMWriter.segment.TEMP, 0);
      this.writer.writePop(VMWriter.segment.POINTER, 1);
      this.writer.writePush(VMWriter.segment.TEMP, 0);
      this.writer.writePop(VMWriter.segment.THAT, 0);
    } else {
      this.writePopVar(varName);
    }

    this.eatValue(";");
  }

  // Example:
  // if (x = 5) { x = 7 } else { x = 8 }
  compileIf() {
    this.eatKey(Analizer.nonTerminalKeywords.IF_STATEMENT);

    const callId = genId();
    const ifTrueLabel = `IF_TRUE_${callId}`;
    const ifFalseLabel = `IF_FALSE_${callId}`;
    const ifEndLabel = `IF_END_${callId}`;

    this.eatValue(Analizer.statementKeywords.IF);
    this.eatValue("(");
    this.compileExpression();
    this.eatValue(")");

    this.writer.writeIf(ifTrueLabel);
    this.writer.writeGoto(ifFalseLabel);
    this.writer.writeLabel(ifTrueLabel);

    this.eatValue("{");
    this.compileStatements();
    this.eatValue("}");

    const withElse =
      this.treeBrowser.getCurrentNodeValue() ===
      Analizer.statementKeywords.ELSE;

    if (withElse) {
      this.writer.writeGoto(ifEndLabel);
    }

    this.writer.writeLabel(ifFalseLabel);

    if (withElse) {
      this.eatValue(Analizer.statementKeywords.ELSE);
      this.eatValue("{");
      this.compileStatements();
      this.eatValue("}");
      this.writer.writeLabel(ifEndLabel);
    }
  }

  // Example:
  // while (i < max) { let i = i + 1; }
  compileWhile() {
    const callId = genId();
    const whileExpLabel = `WHILE_EXP_${callId}`;
    const whileEndLabel = `WHILE_END_${callId}`;

    this.eatKey(Analizer.nonTerminalKeywords.WHILE_STATEMENT);

    this.writer.writeLabel(whileExpLabel);

    this.eatValue(Analizer.statementKeywords.WHILE);
    this.eatValue("(");
    this.compileExpression();
    this.eatValue(")");

    this.writer.writeArithmetic(VMWriter.commands.NOT);
    this.writer.writeIf(whileEndLabel);

    this.eatValue("{");
    this.compileStatements();
    this.eatValue("}");

    this.writer.writeGoto(whileExpLabel);
    this.writer.writeLabel(whileEndLabel);
  }

  // Example
  // do showPoint();
  compileDo() {
    this.eatKey(Analizer.nonTerminalKeywords.DO_STATEMENT);
    this.eatValue(Analizer.statementKeywords.DO);

    const identifier = this.readValue();
    const nextSymbol = this.treeBrowser.getCurrentNodeValue();

    this.compileSubroutineCall(identifier, nextSymbol);
    this.eatValue(";");

    this.writer.writePop(VMWriter.segment.TEMP, 0);
  }

  // Example:
  // return 5;
  // return p1.add(p2);
  // return;
  compileReturn() {
    this.eatKey(Analizer.nonTerminalKeywords.RETURN_STATEMENT);

    this.eatValue(Analizer.statementKeywords.RETURN);

    const { returnType } = this.currentSubroutine;

    if (returnType === "void") {
      this.writer.writePush(VMWriter.segment.CONSTANT, 0);
    } else if (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.EXPRESSION
    ) {
      this.compileExpression();
    }

    this.eatValue(";");

    this.writer.writeReturn();
  }

  // term (op term)*
  compileExpression() {
    this.eatKey(Analizer.nonTerminalKeywords.EXPRESSION);

    this.compileTerm();

    while (Analizer.op.includes(this.treeBrowser.getCurrentNodeValue())) {
      const op = this.readValue();
      this.compileTerm();
      this.writeOp(op);
    }
  }

  compileTerm() {
    this.eatKey(Analizer.nonTerminalKeywords.TERM);

    const nodeValue = this.treeBrowser.getCurrentNodeValue();

    // Example: (2 + 3) * 5
    if (nodeValue === "(") {
      this.eatValue("(");
      this.compileExpression();
      this.eatValue(")");
      return;
    }

    const nodeKey = this.treeBrowser.getCurrentNodeKey();
    let unaryOp;

    // Example:
    // unaryOp is symbol `-` in expression: 3 * -5
    if (nodeKey === Tokenizer.tokenTypes.SYMBOL) {
      unaryOp = this.readValue();
      this.eatKey(Analizer.nonTerminalKeywords.TERM);
    }

    const tokenType = this.treeBrowser.getCurrentNodeKey();
    const variable = this.readValue();

    // handle true, false, this, null
    if (Object.values(Analizer.keywordConstant).includes(variable)) {
      if (variable === Analizer.keywordConstant.TRUE) {
        this.writer.writePush(VMWriter.segment.CONSTANT, 0);
        this.writer.writeArithmetic(VMWriter.commands.NOT);
      } else if (
        variable === Analizer.keywordConstant.FALSE ||
        variable === Analizer.keywordConstant.NULL
      ) {
        this.writer.writePush(VMWriter.segment.CONSTANT, 0);
      } else if (variable === Analizer.keywordConstant.THIS) {
        this.writer.writePush(VMWriter.segment.POINTER, 0);
      }
    }
    // hadle integer constant
    else if (tokenType === Tokenizer.tokenTypes.INTEGER_CONSTANT) {
      this.writer.writePush(VMWriter.segment.CONSTANT, variable);
    }
    // handle string constant
    else if (tokenType === Tokenizer.tokenTypes.STRING_CONSTANT) {
      this.writer.writePush(VMWriter.segment.CONSTANT, variable.length);
      this.writer.writeCall("String.new", 1);

      if (variable !== "") {
        variable.split("").forEach((char) => {
          this.writer.writePush(VMWriter.segment.CONSTANT, char.charCodeAt());
          this.writer.writeCall("String.appendChar", 2);
        });
      }
    }
    // handle all types of identifiers, example:
    // let x = xOffset;
    // let x = p1.x + p2.x;
    // let x = getXCoord();
    // let count = Point.getTotalPoints();
    // let arr[count + 5] = points[keys[3]];
    else if (tokenType === Tokenizer.tokenTypes.IDENTIFIER) {
      const nextSymbol = this.treeBrowser.getCurrentNodeValue();

      // Example:
      // let x = getXCoord();
      // let count = Point.getTotalPoints();
      if (nextSymbol === "(" || nextSymbol === ".") {
        this.compileSubroutineCall(variable, nextSymbol);
      }
      // Example:
      // let arr[count + 5] = points[keys[3]];
      else if (nextSymbol === "[") {
        this.eatValue("[");
        this.compileExpression();
        this.eatValue("]");
        this.writePushVar(variable);
        this.writer.writeArithmetic(VMWriter.commands.ADD);
        this.writer.writePop(VMWriter.segment.POINTER, 1);
        this.writer.writePush(VMWriter.segment.THAT, 0);
      }
      // Example
      // let x = xOffset;
      else {
        this.writePushVar(variable);
      }
    }
    // Special case when variable is unaryOp and followed by "("
    // Example:
    // let x = -(5 + 3)
    else if (variable === "(") {
      this.compileExpression();
      this.eatValue(")");
    }

    this.writeUnaryOp(unaryOp);
  }

  // suppose subroutine call: do calcDistance(p1, p2);
  // identifier is: calcDistance
  // nextSymbol is: (
  compileSubroutineCall(identifier, nextSymbol) {
    // Example: do calcDistance(p1, p2);
    if (nextSymbol === "(") {
      this.eatValue("(");

      this.writer.writePush(VMWriter.segment.POINTER, 0);

      const nArgs = this.getNArgsInExpList(
        this.treeBrowser.getCurrentNodeValue()
      );

      this.compileExpressionList();

      this.eatValue(")");

      this.writer.writeCall([this.className, identifier].join("."), nArgs + 1);
    }
    // do Point.staticMethodCalc(p1, p2);
    else if (nextSymbol === ".") {
      this.eatValue(".");

      const methodName = this.readValue();

      this.eatValue("(");
      const nArgs = this.getNArgsInExpList(
        this.treeBrowser.getCurrentNodeValue()
      );

      // Example:
      // var Point p1, p2, p3;
      // let p1 = Point.new(2, 3);
      // let p2 = Point.new(4, 5);
      // let p3 = p1.add(p2);
      // from subroutine symbol table we know that
      // p1 is a pointer and contains address of constructed `Point`
      // that we need to pass to called function as 0 argument
      // p1.add(p2) --> add(p1, p2)
      if (this.varExists(identifier)) {
        this.writePushVar(identifier);
        this.compileExpressionList();
        this.eatValue(")");

        const { type } = this.lookupVar(identifier);
        this.writer.writeCall([type, methodName].join("."), nArgs + 1);
      }
      // else it is static function and we do not need
      // to pass callee's address as 0 argument
      // Example:
      // let distance = Point.measureDistance(p1, p2);
      // Point.measureDistance(p1, p2) --> Point.measureDistance(p1, p2)
      else {
        this.compileExpressionList();
        this.eatValue(")");
        this.writer.writeCall([identifier, methodName].join("."), nArgs);
      }
    }
  }

  // suppose subroutine call: do calcDistance(p1.add(p3), p2);
  // expression list is: p1.add(p3), p2
  compileExpressionList() {
    const isEmpty = !this.treeBrowser.getCurrentNodeValue().length;

    this.eatKey(Analizer.nonTerminalKeywords.EXPRESSION_LIST);

    if (isEmpty) {
      return;
    }

    this.compileExpression();

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.eatValue(",");
      this.compileExpression();
    }
  }

  // Example:
  // getNArgsInExpList(<expressionList>
  //                     <expression>...</expression>
  //                     <symbol> , <symbol/>
  //                     <expression>...</expression>
  //                   </expressionList>) === 2;
  getNArgsInExpList(expListValue) {
    return expListValue.filter(
      (node) => node[Analizer.nonTerminalKeywords.EXPRESSION]
    ).length;
  }
}

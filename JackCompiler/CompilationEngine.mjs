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

    fs.writeFileSync(outputFile + ".json", format(analizerTree));

    this.compileClass();
  }

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

  setCurrentSubroutine(name, returnType, kind) {
    this.currentSubroutine = {
      name,
      returnType,
      kind,
    };
  }

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

  compileDo() {
    this.eatKey(Analizer.nonTerminalKeywords.DO_STATEMENT);
    this.eatValue(Analizer.statementKeywords.DO);

    const identifier = this.readValue();
    const nextSymbol = this.treeBrowser.getCurrentNodeValue();

    this.compileSubroutineCall(identifier, nextSymbol);
    this.eatValue(";");

    this.writer.writePop(VMWriter.segment.TEMP, 0);
  }

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

    if (nodeValue === "(") {
      this.eatValue("(");
      this.compileExpression();
      this.eatValue(")");
      return;
    }

    const nodeKey = this.treeBrowser.getCurrentNodeKey();
    let op;

    if (nodeKey === Tokenizer.tokenTypes.SYMBOL) {
      op = this.readValue();
      this.eatKey(Analizer.nonTerminalKeywords.TERM);
    }

    const tokenType = this.treeBrowser.getCurrentNodeKey();
    const variable = this.readValue();

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
    } else if (tokenType === Tokenizer.tokenTypes.INTEGER_CONSTANT) {
      this.writer.writePush(VMWriter.segment.CONSTANT, variable);
    } else if (tokenType === Tokenizer.tokenTypes.STRING_CONSTANT) {
      this.writer.writePush(VMWriter.segment.CONSTANT, variable.length);
      this.writer.writeCall("String.new", 1);

      if (variable !== "") {
        variable.split("").forEach((char) => {
          this.writer.writePush(VMWriter.segment.CONSTANT, char.charCodeAt());
          this.writer.writeCall("String.appendChar", 2);
        });
      }
    } else if (tokenType === Tokenizer.tokenTypes.IDENTIFIER) {
      const nextSymbol = this.treeBrowser.getCurrentNodeValue();

      if (nextSymbol === "(" || nextSymbol === ".") {
        this.compileSubroutineCall(variable, nextSymbol);
      } else if (nextSymbol === "[") {
        this.eatValue("[");
        this.compileExpression();
        this.eatValue("]");
        this.writePushVar(variable);
        this.writer.writeArithmetic(VMWriter.commands.ADD);
        this.writer.writePop(VMWriter.segment.POINTER, 1);
        this.writer.writePush(VMWriter.segment.THAT, 0);
      } else {
        this.writePushVar(variable);
      }
    } else if (variable === "(") {
      this.compileExpression();
      this.eatValue(")");
    }

    this.writeUnaryOp(op);
  }

  compileSubroutineCall(identifier, nextSymbol) {
    if (nextSymbol === "(") {
      this.eatValue("(");

      this.writer.writePush(VMWriter.segment.POINTER, 0);

      const nArgs = this.compileExpressionList();
      this.eatValue(")");

      this.writer.writeCall([this.className, identifier].join("."), nArgs + 1);
    } else if (nextSymbol === ".") {
      this.eatValue(".");

      const methodName = this.readValue();

      this.eatValue("(");
      const nArgs = this.compileExpressionList();
      this.eatValue(")");

      if (this.varExists(identifier)) {
        this.writePushVar(identifier);

        const { type } = this.lookupVar(identifier);
        this.writer.writeCall([type, methodName].join("."), nArgs + 1);
      } else {
        this.writer.writeCall([identifier, methodName].join("."), nArgs);
      }
    }
  }

  compileExpressionList() {
    const isEmpty = !this.treeBrowser.getCurrentNodeValue().length;
    let nArgs = 0;

    this.eatKey(Analizer.nonTerminalKeywords.EXPRESSION_LIST);

    if (isEmpty) {
      return nArgs;
    }

    this.compileExpression();
    nArgs++;

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.eatValue(",");
      this.compileExpression();
      nArgs++;
    }

    return nArgs;
  }
}

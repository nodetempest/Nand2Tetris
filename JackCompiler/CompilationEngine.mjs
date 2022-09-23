import fs from "fs";

import { SymbolTable } from "./SymbolTable.mjs";
import { NLRTreeBrowser } from "./NLRTreeBrowser.mjs";
import { VMWriter } from "./VMWriter.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { format } from "./utils.mjs";
import { CompilationEngine as Analizer } from "../JackAnalyzer/CompilationEngine.mjs";
import { Tokenizer } from "../JackAnalyzer/Tokenizer.mjs";

export class CompilationEngine {
  classSymbolTable = new SymbolTable();
  subroutineSymbolTable = new SymbolTable();

  className = "Main";

  currentSubroutine = {
    kind: "function",
    returnType: "void",
    name: "main",
  };

  constructor(inputFile, outputFile) {
    this.writer = new VMWriter(outputFile);

    const analizer = new Analizer(inputFile);
    const analizerTree = analizer.compile();
    this.treeBrowser = new NLRTreeBrowser(analizerTree);

    // " tokenvalue " --> "tokenvalue"
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

  lookupVar(varName) {
    const table = this.subroutineSymbolTable.hasVar(varName)
      ? this.subroutineSymbolTable
      : this.classSymbolTable;

    let segment = table.kindOf(varName);
    if (segment === SymbolTable.kind.field) {
      segment = VMWriter.segment.this;
    }
    const index = table.indexOf(varName);

    return { segment, index };
  }

  writePushVar(varName) {
    const { segment, index } = this.lookupVar(varName);
    this.writer.writePush(segment, index);
  }

  writePopVar(varName) {
    const { segment, index } = this.lookupVar(varName);
    this.writer.writePop(segment, index);
  }

  writeOp(op) {
    const opMap = {
      "+": VMWriter.commands.add,
      "-": VMWriter.commands.sub,
      "=": VMWriter.commands.eq,
      ">": VMWriter.commands.gt,
      "<": VMWriter.commands.lt,
      "&": VMWriter.commands.and,
      "|": VMWriter.commands.or,
      "+": VMWriter.commands.add,
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
      "-": VMWriter.commands.neg,
      "~": VMWriter.commands.not,
    };

    if (op in opMap) {
      this.writer.writeArithmetic(opMap[op]);
    }
  }

  compileClass() {
    this.eatKey(Analizer.nonTerminalKeywords.class);

    this.eatValue("class");
    this.className = this.readValue();

    this.eatValue("{");

    while (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.classVarDec
    ) {
      this.compileClassVarDec();
    }

    while (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.subroutineDec
    ) {
      this.compileSubroutineDec();
    }

    this.eatValue("}");
    this.eatKey(null);
  }

  compileClassVarDec() {
    this.eatKey(Analizer.nonTerminalKeywords.classVarDec);

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
    this.eatKey(Analizer.nonTerminalKeywords.subroutineDec);
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
    if (this.currentSubroutine.kind === "method") {
      this.subroutineSymbolTable.define(
        "this",
        this.className,
        SymbolTable.kind.argument
      );
    }

    const paramListIsEmpty = !this.treeBrowser.getCurrentNodeValue().length;

    this.eatKey(Analizer.nonTerminalKeywords.parameterList);

    if (paramListIsEmpty) {
      return;
    }

    const type = this.readValue();
    const name = this.readValue();
    this.subroutineSymbolTable.define(name, type, SymbolTable.kind.argument);

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.eatValue(",");
      const type = this.readValue();
      const name = this.readValue();
      this.subroutineSymbolTable.define(name, type, SymbolTable.kind.argument);
    }
  }

  complieSubroutineBody() {
    const { name, kind } = this.currentSubroutine;

    this.eatKey(Analizer.nonTerminalKeywords.subroutineBody);
    this.eatValue("{");

    while (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.varDec
    ) {
      this.compileVarDec();
    }

    const fnName = [this.className, name].join(".");
    const nLocals = this.subroutineSymbolTable.varCount(SymbolTable.kind.local);

    this.writer.wrtieFunction(fnName, nLocals);

    if (kind === "constructor") {
      const nFields = this.classSymbolTable.varCount(SymbolTable.kind.field);
      this.writer.writePush(VMWriter.segment.constant, nFields);
      this.writer.writeCall("Memory.alloc", 1);
      this.writer.writePop(VMWriter.segment.pointer, 0);
    } else if (kind === "method") {
      this.writer.writePush(VMWriter.segment.argument, 0);
      this.writer.writePop(VMWriter.segment.pointer, 0);
    }

    this.compileStatements();

    this.eatValue("}");
  }

  compileVarDec() {
    this.eatKey(Analizer.nonTerminalKeywords.varDec);

    this.eatValue("var");
    const kind = SymbolTable.kind.local;
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
    this.eatKey(Analizer.nonTerminalKeywords.statements);

    while (
      [
        Analizer.nonTerminalKeywords.returnStatement,
        Analizer.nonTerminalKeywords.letStatement,
      ].includes(this.treeBrowser.getCurrentNodeKey())
    ) {
      if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.returnStatement
      ) {
        this.compileReturn();
      } else if (
        this.treeBrowser.getCurrentNodeKey() ===
        Analizer.nonTerminalKeywords.letStatement
      ) {
        this.compileLet();
      }
    }
  }

  compileLet() {
    this.eatKey(Analizer.nonTerminalKeywords.letStatement);
    this.eatValue("let");
    const varName = this.readValue();
    this.eatValue("=");
    this.compileExpression();

    this.writePopVar(varName);

    this.eatValue(";");
  }

  compileIf() {}

  compileWhile() {}

  compileDo() {}

  // TODO: complete return implementation
  compileReturn() {
    this.eatKey(Analizer.nonTerminalKeywords.returnStatement);

    this.eatValue("return");

    const { kind, returnType } = this.currentSubroutine;

    if (kind === "method" && returnType === "void") {
      this.writer.writePush(VMWriter.segment.constant, 0);
    } else if (
      this.treeBrowser.getCurrentNodeKey() ===
      Analizer.nonTerminalKeywords.expression
    ) {
      this.compileExpression();
    }

    this.eatValue(";");

    this.writer.writeReturn();
  }

  compileExpression() {
    this.eatKey(Analizer.nonTerminalKeywords.expression);

    this.compileTerm();

    while (Analizer.op.includes(this.treeBrowser.getCurrentNodeValue())) {
      const op = this.readValue();
      this.compileTerm();
      this.writeOp(op);
    }
  }

  compileTerm() {
    this.eatKey(Analizer.nonTerminalKeywords.term);

    const nodeValue = this.treeBrowser.getCurrentNodeValue();

    if (nodeValue === "(") {
      this.eatValue("(");
      this.compileExpression();
      this.eatValue(")");
      return;
    }

    const nodeKey = this.treeBrowser.getCurrentNodeKey();
    let op;

    if (nodeKey === "symbol") {
      op = this.readValue();
      this.eatKey(Analizer.nonTerminalKeywords.term);
    }

    const tokenType = this.treeBrowser.getCurrentNodeKey();
    const variable = this.readValue();

    if (Object.values(Analizer.keywordConstant).includes(variable)) {
      if (variable === Analizer.keywordConstant.true) {
        this.writer.writePush(VMWriter.segment.constant, 0);
        this.writer.writeArithmetic(VMWriter.commands.not);
      } else if (
        variable === Analizer.keywordConstant.false ||
        variable === Analizer.keywordConstant.null
      ) {
        this.writer.writePush(VMWriter.segment.constant, 0);
      } else if (variable === Analizer.keywordConstant.this) {
        this.writer.writePush(VMWriter.segment.pointer, 0);
      }
    } else if (tokenType === Tokenizer.tokenTypes.integerConstant) {
      this.writer.writePush(VMWriter.segment.constant, variable);
    } else if (tokenType === Tokenizer.tokenTypes.stringConstant) {
      this.writer.writePush(VMWriter.segment.constant, variable.length);
      this.writer.writeCall("String.new", 1);

      if (variable !== "") {
        variable.split("").forEach((char) => {
          this.writer.writePush(VMWriter.segment.constant, char.charCodeAt());
          this.writer.writeCall("String.appendChar", 2);
        });
      }
    } else if (tokenType === Tokenizer.tokenTypes.identifier) {
      const nextSymbol = this.treeBrowser.getCurrentNodeValue();

      if (nextSymbol === "(") {
        this.eatValue("(");

        this.writer.writePush(VMWriter.segment.pointer, 0);

        const nArgs = this.compileExpressionList();
        this.eatValue(")");

        this.writer.writeCall([this.className, variable].join("."), nArgs + 1);
      } else if (nextSymbol === "[") {
        // TODO: implement arrays
      } else if (nextSymbol === ".") {
        this.eatValue(".");

        const methodName = this.readValue();

        this.eatValue("(");
        const nArgs = this.compileExpressionList();
        this.eatValue(")");

        this.writer.writeCall([variable, methodName].join("."), nArgs);
      } else {
        this.writePushVar(variable);
      }
    }

    this.writeUnaryOp(op);
  }

  compileExpressionList() {
    const isEmpty = !this.treeBrowser.getCurrentNodeValue().length;
    let nArgs = 0;

    this.eatKey(Analizer.nonTerminalKeywords.expressionList);

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

import fs from "fs";

import { SymbolTable } from "./SymbolTable.mjs";
import { NLRTreeBrowser } from "./NLRTreeBrowser.mjs";
import { VMWriter } from "./VMWriter.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { format } from "./utils.mjs";
import { CompilationEngine as Analizer } from "../JackAnalyzer/CompilationEngine.mjs";

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
    this.treeBrowser.mapValues((value) => value?.trim?.() || value);

    fs.writeFileSync(outputFile + ".json", format(analizerTree));

    this.compileClass();
  }

  advance() {
    this.treeBrowser.advance();
  }

  eatType(nodeType) {
    const currentNodeType = this.getCurrentNodeType();

    if (nodeType === null && currentNodeType === null) {
      return;
    } else if (nodeType === null && this.treeBrowser.hasMoreNodes()) {
      throw new CompilationEngineError(
        [
          `Expected EOF but recieved node type: '${currentNodeType}'`,
          `expected: '${nodeType}'`,
          `at node: ${format(this.treeBrowser.getCurrentNode())}`,
        ].join("\r\n")
      );
    }

    if (currentNodeType !== nodeType) {
      throw new CompilationEngineError(
        [
          `Invalid node type: '${currentNodeType}'`,
          `expected: '${nodeType}'`,
          `at node: ${format(this.treeBrowser.getCurrentNode())}`,
        ].join("\r\n")
      );
    } else {
      this.advance();
    }
  }

  eatValue(nodeValue) {
    const currentNodeValue = this.getCurrentNodeValue();

    if (currentNodeValue !== nodeValue) {
      throw new CompilationEngineError(
        [
          `Invalid node value: ${format(currentNodeValue)}`,
          `expected: '${nodeValue}'`,
          `at node: ${format(this.treeBrowser.getCurrentNode())}`,
        ].join("\r\n")
      );
    } else {
      this.advance();
    }
  }

  readValue() {
    const value = this.getCurrentNodeValue();
    this.advance();
    return value;
  }

  readType() {
    const type = this.getCurrentNodeType();
    this.advance();
    return type;
  }

  getCurrentNodeType() {
    return this.treeBrowser.getCurrentNodeType();
  }

  getCurrentNodeValue() {
    return this.treeBrowser.getCurrentNodeLeaves();
  }

  setCurrentSubroutine(name, returnType, kind) {
    this.currentSubroutine = {
      name,
      returnType,
      kind,
    };
  }

  compileClass() {
    this.eatType(Analizer.nonTerminalKeywords.class);

    this.eatValue("class");
    this.className = this.readValue();

    this.eatValue("{");

    while (
      this.getCurrentNodeType() === Analizer.nonTerminalKeywords.classVarDec
    ) {
      this.compileClassVarDec();
    }

    while (
      this.getCurrentNodeType() === Analizer.nonTerminalKeywords.subroutineDec
    ) {
      this.compileSubroutineDec();
    }

    this.eatValue("}");
    this.eatType(null);
  }

  compileClassVarDec() {
    this.eatType(Analizer.nonTerminalKeywords.classVarDec);

    const kind = this.readValue();
    const type = this.readValue();
    const name = this.readValue();

    this.classSymbolTable.define(name, type, kind);

    while (this.getCurrentNodeValue() === ",") {
      this.eatValue(",");

      const name = this.readValue();
      this.classSymbolTable.define(name, type, kind);
    }
    this.eatValue(";");
  }

  compileSubroutineDec() {
    this.eatType(Analizer.nonTerminalKeywords.subroutineDec);
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
        SymbolTable.kind.arg
      );
    }

    const paramListIsEmpty = !this.getCurrentNodeValue().length;

    this.eatType(Analizer.nonTerminalKeywords.parameterList);

    if (paramListIsEmpty) {
      return;
    }

    const type = this.readValue();
    const name = this.readValue();
    this.subroutineSymbolTable.define(type, name, SymbolTable.kind.arg);

    while (this.getCurrentNodeValue() === ",") {
      this.compileVarDec();
    }
  }

  complieSubroutineBody() {
    const { name, kind } = this.currentSubroutine;

    this.eatType(Analizer.nonTerminalKeywords.subroutineBody);
    this.eatValue("{");

    while (this.getCurrentNodeType() === Analizer.nonTerminalKeywords.varDec) {
      this.compileVarDec();
    }

    const fnName = [this.className, name].join(".");
    const nLocals = this.subroutineSymbolTable.varCount(SymbolTable.kind.var);

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
    this.eatType(Analizer.nonTerminalKeywords.varDec);

    const kind = this.readValue();
    const type = this.readValue();
    const name = this.readValue();

    this.subroutineSymbolTable.define(name, type, kind);

    while (this.getCurrentNodeValue() === ",") {
      this.eatValue(",");
      const name = this.readValue();
      this.subroutineSymbolTable.define(name, type, kind);
    }

    this.eatValue(";");
  }

  compileStatements() {
    this.eatType(Analizer.nonTerminalKeywords.statements);

    const statement = this.getCurrentNodeType();

    if (statement === "returnStatement") {
      this.compileReturn();
    }
  }

  compileLet() {}

  compileIf() {}

  compileWhile() {}

  compileDo() {}

  // TODO: complete return implementation
  compileReturn() {
    this.eatType(Analizer.nonTerminalKeywords.returnStatement);

    this.eatValue("return");

    const { kind, returnType } = this.currentSubroutine;

    if (kind === "method" && returnType === "void") {
      this.writer.writePush(VMWriter.segment.constant, 0);
    } else if (
      this.getCurrentNodeType() === Analizer.nonTerminalKeywords.expression
    ) {
      this.compileExpression();
    }

    this.eatValue(";");

    this.writer.writeReturn();
  }

  compileExpression() {
    this.eatType(Analizer.nonTerminalKeywords.expression);
    this.eatType(Analizer.nonTerminalKeywords.term);
    const value = this.readValue();

    if (value === "this") {
      this.writer.writePush(VMWriter.segment.pointer, 0);
    } else {
      this.writer.writePush(VMWriter.segment.constant, value);
    }
  }

  compileTerm() {}

  compileExpressionList() {}
}

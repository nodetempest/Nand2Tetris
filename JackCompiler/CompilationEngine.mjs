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
        SymbolTable.kind.arg
      );
    }

    const paramListIsEmpty = !this.treeBrowser.getCurrentNodeValue().length;

    this.eatKey(Analizer.nonTerminalKeywords.parameterList);

    if (paramListIsEmpty) {
      return;
    }

    const type = this.readValue();
    const name = this.readValue();
    this.subroutineSymbolTable.define(type, name, SymbolTable.kind.arg);

    while (this.treeBrowser.getCurrentNodeValue() === ",") {
      this.compileVarDec();
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
    this.eatKey(Analizer.nonTerminalKeywords.varDec);

    const kind = this.readValue();
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

    const statement = this.treeBrowser.getCurrentNodeKey();

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
    this.eatKey(Analizer.nonTerminalKeywords.term);
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

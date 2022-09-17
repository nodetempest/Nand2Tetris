import fs from "fs";

import { SymbolTable } from "./SymbolTable.mjs";
import { NLRTreeBrowser } from "./NLRTreeBrowser.mjs";
import { VMWriter } from "./VMWriter.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { CompilationEngine as Analizer } from "../JackAnalyzer/CompilationEngine.mjs";

export class CompilationEngine {
  classSymbolTable = new SymbolTable();
  subroutineSymbolTable = new SymbolTable();

  constructor(inputFile, outputFile) {
    this.writer = new VMWriter(outputFile);

    const analizer = new Analizer(inputFile);
    const analizerTree = analizer.compile();
    this.treeBrowser = new NLRTreeBrowser(analizerTree);

    fs.writeFileSync(outputFile, JSON.stringify(analizerTree, null, 2));
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
        `Expected EOF but recieved node type: ${currentNodeType}`
      );
    }

    if (currentNodeType !== nodeType) {
      throw new CompilationEngineError(`Invalid node type: ${currentNodeType}`);
    } else {
      this.advance();
    }
  }

  eatValue(nodeValue) {
    const currentNodeValue = this.getCurrentNodeValue();

    if (currentNodeValue !== nodeValue) {
      throw new CompilationEngineError(
        `Invalid node value: ${currentNodeValue}`
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

  getCurrentNodeType() {
    return this.treeBrowser.getCurrentNodeType();
  }

  getCurrentNodeValue() {
    let value = this.treeBrowser.getCurrentNodeValue();

    if (typeof value === "string") {
      value = value.trim();
    }

    return value;
  }

  compileClass() {
    this.eatType(Analizer.nonTerminalKeywords.class);
    this.advance();
    this.eatValue("{");

    while (
      this.treeBrowser.getCurrentNodeType() ===
      Analizer.nonTerminalKeywords.classVarDec
    ) {
      this.compileClassVarDec();
    }

    while (
      this.treeBrowser.getCurrentNodeType() ===
      Analizer.nonTerminalKeywords.subroutineDec
    ) {
      this.compileSubroutineDec();
    }

    this.eatValue("}");
    this.eatType(null);
  }

  compileClassVarDec() {
    this.eat(Analizer.nonTerminalKeywords.classVarDec);

    const kind = this.readValue();
    const type = this.readValue();
    let name = this.readValue();

    this.classSymbolTable.define(name, type, kind);

    while (this.getCurrentNodeValue() === ",") {
      this.eat(",");

      name = this.readValue();
      this.classSymbolTable.define(name, type, kind);
    }
    this.eat(";");
  }

  compileSubroutineDec() {}

  complieParameterList() {}

  complieSubroutineBody() {
    this.eatType(Analizer.nonTerminalKeywords.subroutineBody);
    this.eatValue("{");

    while (this.getCurrentNodeType() === Analizer.nonTerminalKeywords.varDec) {
      this.compileVarDec();
    }

    this.compileStatements();

    this.eatValue("}");
  }

  compileVarDec() {
    this.eatType(Analizer.nonTerminalKeywords.varDec);

    const kind = this.readValue();
    const type = this.readValue();
    const name = this.readValue();

    this.classSymbolTable.define(name, type, kind);

    this.eatValue(";");
  }

  compileStatements() {}

  compileLet() {}

  compileIf() {}

  compileWhile() {}

  compileDo() {}

  compileReturn() {}

  compileExpression() {}

  compileTerm() {}

  compileExpressionList() {}
}

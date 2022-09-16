import fs from "fs";

import { SymbolTable } from "./SymbolTable.mjs";
import { NLRTreeBrowser } from "./NLRTreeBrowser.mjs";
import { VMWriter } from "./VMWriter.mjs";
import { CompilationEngineError } from "./errors.mjs";
import { CompilationEngine as JackAnalyzer } from "../JackAnalyzer/CompilationEngine.mjs";

export class CompilationEngine {
  constructor(inputFile, outputFile) {
    this.writer = new VMWriter(outputFile);

    const analizer = new JackAnalyzer(inputFile);
    const analizerTree = analizer.compile();
    this.treeBrowser = new NLRTreeBrowser(analizerTree);

    fs.writeFileSync(outputFile, JSON.stringify(analizerTree, null, 2));
  }

  eat(nodeType) {
    const currentNodeType = this.treeBrowser.getCurrentNodeType();

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
      this.treeBrowser.advance();
    }
  }

  compileClass() {}

  compileClassVarDec() {}

  compileSubroutineDec() {}

  complieParameterList() {}

  complieSubroutineBody() {}

  compileVarDec() {}

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

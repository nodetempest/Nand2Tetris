import fs from "fs";
import { SymbolTable } from "./SymbolTable.mjs";
import { NLRTreeBrowser } from "./NLRTreeBrowser.mjs";
import { VMWriter } from "./VMWriter.mjs";

import { CompilationEngine as JackAnalyzer } from "../JackAnalyzer/CompilationEngine.mjs";

export class CompilationEngine {
  constructor(inputFile, outputFile) {
    this.writer = new VMWriter(outputFile);

    const analizer = new JackAnalyzer(inputFile);
    const analizerTree = analizer.compile();
    this.treeBrowser = new NLRTreeBrowser(analizerTree);

    fs.writeFileSync(outputFile, JSON.stringify(analizerTree, null, 2));
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

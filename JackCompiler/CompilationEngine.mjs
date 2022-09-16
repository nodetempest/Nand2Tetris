import fs from "fs";
import { SymbolTable } from "./SymbolTable.mjs";
import { VMWriter } from "./VMWriter.mjs";
import { CompilationEngine as JackAnalyzer } from "../JackAnalyzer/CompilationEngine.mjs";

export class CompilationEngine {
  constructor(inputFile, outputFile) {
    this.writer = new VMWriter(outputFile);

    const analizer = new JackAnalyzer(inputFile);
    this.tree = analizer.compile();

    fs.writeFileSync(outputFile, JSON.stringify(this.tree, null, 2));
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

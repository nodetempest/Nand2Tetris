import fs from "fs";
import { CompilationEngine as JackAnalyzer } from "../JackAnalyzer/CompilationEngine.mjs";

export class CompilationEngine {
  tree = {};

  constructor(inputFile, outputFile) {
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

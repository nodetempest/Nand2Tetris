import fs from "fs";

export class CompilationEngine {
  constructor(inputFile, outputFile) {
    fs.writeFileSync(outputFile, "");
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

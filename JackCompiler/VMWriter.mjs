import fs from "fs";

export class VMWriter {
  static segment = {
    CONST: "CONST",
    ARG: "ARG",
    LOCAL: "LOCAL",
    STATIC: "STATIC",
    THIS: "THIS",
    THAT: "THAT",
    POINTER: "POINTER",
    TEMP: "TEMP",
  };

  static commands = {
    ADD: "ADD",
    SUB: "SUB",
    NEG: "NEG",
    EQ: "EQ",
    GT: "GT",
    LT: "LT",
    AND: "AND",
    OR: "OR",
    NOT: "NOT",
  };

  constructor(outputFile) {
    this.outputFile = outputFile;
  }

  write(content) {
    fs.writeFileSync(this.outputFile, content);
  }

  writePush(segment, index) {
    this.write(`push ${segment.toLowerCase()} ${index}`);
  }

  writePop(segment, index) {
    this.write(`pop ${segment.toLowerCase()} ${index}`);
  }

  writeArithmetic(command) {
    this.write(command.toLowerCase());
  }

  writeLabel(label) {
    this.write(`label ${label}`);
  }

  writeGoto(label) {
    this.write(`goto ${label}`);
  }

  writeIf(label) {
    this.write(`if-goto ${label}`);
  }

  writeCall(name, nArgs) {
    this.write(`call ${name} ${nArgs}`);
  }

  wrtieFunction(name, nLocals) {
    this.write(`function ${name} ${nLocals}`);
  }

  writeReturn() {
    this.write("return");
  }
}

import fs from "fs";

export class VMWriter {
  static segment = {
    CONSTANT: "constant",
    ARGUMENT: "argument",
    LOCAL: "local",
    STATIC: "static",
    THIS: "this",
    THAT: "that",
    POINTER: "pointer",
    TEMP: "temp",
  };

  static commands = {
    ADD: "add",
    SUB: "sub",
    NEG: "neg",
    EQ: "eq",
    GT: "gt",
    LT: "lt",
    AND: "and",
    OR: "or",
    NOT: "not",
  };

  constructor(outputFile) {
    this.outputFile = outputFile;
    fs.writeFileSync(this.outputFile, "");
  }

  write(content) {
    fs.appendFileSync(this.outputFile, content + "\r\n");
  }

  writePush(segment, index) {
    this.write(`push ${segment} ${index}`);
  }

  writePop(segment, index) {
    this.write(`pop ${segment} ${index}`);
  }

  writeArithmetic(command) {
    this.write(command);
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

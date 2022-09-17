import fs from "fs";

export class VMWriter {
  static segment = {
    const: "const",
    arg: "arg",
    local: "local",
    static: "static",
    this: "this",
    that: "that",
    pointer: "pointer",
    tmep: "tmep",
  };

  static commands = {
    add: "add",
    sub: "sub",
    neg: "neg",
    eq: "eq",
    gt: "gt",
    lt: "lt",
    and: "and",
    or: "or",
    not: "not",
  };

  constructor(outputFile) {
    this.outputFile = outputFile;
  }

  write(content) {
    fs.writeFileSync(this.outputFile, content);
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

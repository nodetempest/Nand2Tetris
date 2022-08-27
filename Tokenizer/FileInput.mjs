import fs from "fs";

export class FileInput {
  content = "";
  pos = 0;

  constructor(file) {
    this.content = fs.readFileSync(file).toString("utf-8");
  }

  getChar() {
    return this.eof() ? null : this.content.charAt(this.pos++);
  }

  eof() {
    return this.pos >= this.content.length;
  }
}

export class FIFOBuffer {
  size = 0;
  buffer = [];

  constructor(size) {
    this.size = size;
  }

  getBuffer() {
    return [...this.buffer];
  }

  setSize(size) {
    this.size = size;
  }

  push(value) {
    this.buffer = this.buffer.concat(value);
    if (this.buffer.length > this.size) {
      this.buffer = this.buffer.slice(1);
    }
  }

  flush() {
    this.buffer = [];
  }

  toString() {
    return this.getBuffer().join("");
  }
}

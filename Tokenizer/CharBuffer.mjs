import { FIFOBuffer } from "./FIFOBuffer.mjs";

export class CharBuffer extends FIFOBuffer {
  getValue() {
    return this.getBuffer().join("");
  }
}

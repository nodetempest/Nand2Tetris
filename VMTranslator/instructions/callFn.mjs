import { genId } from "../utils.mjs";

const savePtrToCallFrame = (ptr, relPos, derefPtrBy = "M") => {
  return [
    "@SP",
    "D=M",
    `@${relPos}`,
    "D=D+A",
    "@temp_ptr",
    "M=D",
    `@${ptr}`,
    `D=${derefPtrBy}`,
    "@temp_ptr",
    "A=M",
    "M=D",
  ].join("\r\n");
};

export const isFnCall = (instruction) => {
  return instruction.startsWith("call");
};

export const callFn = (instruction) => {
  const [, fnName, numberOfArgs] = instruction.split(" ");

  const retAddr = `${fnName}$ret.${genId()}`;

  return [
    savePtrToCallFrame(retAddr, 0, "A"), // save pointers
    savePtrToCallFrame("LCL", 1),
    savePtrToCallFrame("ARG", 2),
    savePtrToCallFrame("THIS", 3),
    savePtrToCallFrame("THAT ", 4),
    "@SP", // set ARG = SP - numberOfArgs
    "D=M",
    `@${numberOfArgs}`,
    "D=D-A",
    "@ARG",
    "M=D",
    "@5", //  move SP to position next to the end of call frame
    "D=A",
    "@SP",
    "M=M+D",
    `@${fnName}`, // goto fn
    "0;JMP",
    `(${retAddr})`, // retAddr
  ].join("\r\n");
};

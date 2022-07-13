import { range } from "../utils.mjs";

const setZerosToLocals = (numberOfLocals) => {
  return range(numberOfLocals).map((position) =>
    [
      "@LCL", // *(LCL + position) = 0
      "D=M",
      `@${position}`,
      "A=D+A",
      "M=0",
    ].join("\r\n")
  );
};

export const isFnDeclaration = (instruction) => {
  return instruction.startsWith("function");
};

export const declFn = (instruction) => {
  const [, fnName, numberOfLocals] = instruction.split(" ");

  return [
    `(${fnName})`,
    "@SP", // set LCL
    "D=M",
    "@LCL",
    "M=D",
    `@${numberOfLocals}`, // set SP
    "D=A",
    "@SP",
    "M=M+D",
    ...setZerosToLocals(numberOfLocals),
  ].join("\r\n");
};

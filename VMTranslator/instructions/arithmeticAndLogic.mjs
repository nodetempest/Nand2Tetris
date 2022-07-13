import { genId } from "../utils.mjs";

const createCompareHandler = (jumpBitName) => {
  const id = genId();

  return [
    "@SP", // SP--; D = *SP
    "M=M-1",
    "A=M",
    "D=M",
    "@SP", // SP--; D = *SP - D
    "M=M-1",
    "A=M",
    "D=M-D",
    `@IF_TRUE.${id}`, // D `compare` 0 ? *SP = true(-1) : *SP = false(0)
    `D;${jumpBitName}`,
    "@SP", // false case
    "A=M",
    "M=0",
    `@IF_FALSE.${id}`,
    "0;JMP",
    `(IF_TRUE.${id})`,
    "@SP", // true case
    "A=M",
    "M=-1",
    `(IF_FALSE.${id})`,
    "@SP", // SP++
    "M=M+1",
  ].join("\r\n");
};

const arithmeticAndLogicMap = {
  add: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP + D
      "M=M-1",
      "A=M",
      "M=M+D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  sub: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP - D
      "M=M-1",
      "A=M",
      "M=M-D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  neg: () => {
    return [
      "@SP", // SP--; *SP = -(*SP)
      "M=M-1",
      "A=M",
      "M=-M",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  and: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP && D
      "M=M-1",
      "A=M",
      "M=M&D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  or: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP || D
      "M=M-1",
      "A=M",
      "M=M|D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  not: [
    "@SP", // SP--; *SP = !(*SP)
    "M=M-1",
    "A=M",
    "M=!M",
    "@SP", // SP++
    "M=M+1",
  ].join("\r\n"),

  eq: createCompareHandler("JEQ"),
  ne: createCompareHandler("JNE"),
  lt: createCompareHandler("JLT"),
  gt: createCompareHandler("JGT"),
  le: createCompareHandler("JLE"),
  ge: createCompareHandler("JGE"),
};

export const isArithmeticAndLogic = (instruction) => {
  return instruction in arithmeticAndLogicMap;
};

export const arithmeticAndLogic = (instruction) => {
  return arithmeticAndLogicMap[instruction]();
};

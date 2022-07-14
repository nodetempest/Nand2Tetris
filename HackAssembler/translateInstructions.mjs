import { DYNAMIC_VARS_START_POS } from "./constants.mjs";
import { range } from "./utils.mjs";

const compBitsMap = {
  0: {
    0: "101010",
    1: "111111",
    "-1": "111010",
    D: "001100",
    A: "110000",
    "!D": "001101",
    "!A": "110001",
    "-D": "001111",
    "-A": "110011",
    "D+1": "011111",
    "A+1": "110111",
    "D-1": "001110",
    "A-1": "110010",
    "D+A": "000010",
    "D-A": "010011",
    "A-D": "000111",
    "D&A": "000000",
    "D|A": "010101",
  },
  1: {
    0: "101010",
    1: "111111",
    "-1": "111010",
    D: "001100",
    M: "110000",
    "!D": "001101",
    "!M": "110001",
    "-D": "001111",
    "-M": "110011",
    "D+1": "011111",
    "M+1": "110111",
    "D-1": "001110",
    "M-1": "110010",
    "D+M": "000010",
    "D-M": "010011",
    "M-D": "000111",
    "D&M": "000000",
    "D|M": "010101",
  },
};

const destBitsMap = {
  null: "000",
  M: "001",
  D: "010",
  MD: "011",
  A: "100",
  AM: "101",
  AD: "110",
  AMD: "111",
};

const jumpBitsMap = {
  null: "000",
  JGT: "001",
  JEQ: "010",
  JGE: "011",
  JLT: "100",
  JNE: "101",
  JLE: "110",
  JMP: "111",
};

export const isAInstruction = (instr) => instr.startsWith("@");

const translateA = (instr) => {
  // @5 --> "101"
  const binary = Number(instr.slice(1)).toString(2);

  // "0000000000000101"
  return range(DYNAMIC_VARS_START_POS - binary.length)
    .map(() => "0")
    .join("")
    .concat(binary);
};

// A=M+D;JMP --> M+D
const getCompPart = (instr) => {
  let compPart = null;

  if (instr.includes("=")) {
    compPart = instr.split("=")[1];
  }

  if (instr.includes(";")) {
    compPart = instr.split(";")[0];
  }

  return compPart;
};

// A=M+D;JMP --> A
const getDestPart = (instr) => {
  let destPart = null;

  if (instr.includes("=")) {
    destPart = instr.split("=")[0];
  }

  return destPart;
};

// A=M+D;JMP --> JMP
const getJumpPart = (instr) => {
  let jumpPart = null;

  if (instr.includes(";")) {
    jumpPart = instr.split(";")[1];
  }

  return jumpPart;
};

const getABit = (instr) => (getCompPart(instr).includes("M") ? "1" : "0");

const getCompBits = (instr) => compBitsMap[getABit(instr)][getCompPart(instr)];

const getDestBits = (instr) => destBitsMap[getDestPart(instr)];

const getJumpBits = (instr) => jumpBitsMap[getJumpPart(instr)];

const translateC = (instr) => {
  return (
    "111" +
    getABit(instr) +
    getCompBits(instr) +
    getDestBits(instr) +
    getJumpBits(instr)
  );
};

export const translateInstructions = (instructions) =>
  instructions.map((instr) =>
    (isAInstruction(instr) ? translateA : translateC)(instr)
  );

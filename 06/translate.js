// Assembler into binary compiler
// Example of usage: node translate ./max/Max.asm
// will emit output into: ./max/Max.hack

const fs = require("fs");

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

// read .asm file content into variable

const pathToFile = process.argv.slice(2)[0];

const fileContent = fs.readFileSync(pathToFile).toString();
const lines = fileContent.split("\r\n");

// Part 1: remove comments

const removeComments = (lines) => {
  return lines.map((line) => line.split("//")[0].trim()).filter(Boolean);
};

// Part 2: translate instructions

const isAInstruction = (instr) => instr.startsWith("@");

const translateA = (instr) => {
  const binary = Number(instr.slice(1)).toString(2);

  return (
    Array(16 - binary.length)
      .fill()
      .map(() => "0")
      .join("") + binary
  );
};

const getCompPart = (instr) => {
  let destPart = "";

  if (instr.includes("=")) {
    destPart = instr.split("=")[1];
  }

  if (instr.includes(";")) {
    destPart = instr.split(";")[0];
  }

  return destPart;
};

const getDestPart = (instr) => {
  let destPart = null;

  if (instr.includes("=")) {
    destPart = instr.split("=")[0];
  }

  return destPart;
};

const getJumpPart = (instr) => {
  let jumpPart = null;

  if (instr.includes(";")) {
    jumpPart = instr.split(";")[1];
  }

  return jumpPart;
};

const getABit = (instr) => (getCompPart(instr).includes("M") ? 1 : 0);

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

const translateInstructions = (instructions) => {
  return instructions.map((instr) =>
    (isAInstruction(instr) ? translateA : translateC)(instr)
  );
};

// process each line and write result into .hack file

const processLines = (lines) => {
  lines = removeComments(lines);
  lines = translateInstructions(lines);
  return lines;
};

fs.writeFileSync(
  pathToFile.replace(".asm", ".hack"),
  processLines(lines).join("\r\n")
);

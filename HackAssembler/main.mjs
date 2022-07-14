import fs from "fs";

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

const predefinedVarsTable = {
  R0: "0",
  R1: "1",
  R2: "2",
  R3: "3",
  R4: "4",
  R5: "5",
  R6: "6",
  R7: "7",
  R8: "8",
  R9: "9",
  R10: "10",
  R11: "11",
  R12: "12",
  R13: "13",
  R14: "14",
  R15: "15",
  SP: "0",
  LCL: "1",
  ARG: "2",
  THIS: "3",
  THAT: "4",
  SCREEN: "16384",
  KBD: "24576",
};

const DYNAMIC_VARS_START_POS = 16;

// Part 1: remove comments

const removeCommentsAndWhitespaces = (instructions) => {
  return instructions
    .map((instr) => instr.split("//")[0].trim())
    .filter(Boolean);
};

// Part 2: translate instructions

const isAInstruction = (instr) => instr.startsWith("@");

const translateA = (instr) => {
  const binary = Number(instr.slice(1)).toString(2);

  return (
    Array(DYNAMIC_VARS_START_POS - binary.length)
      .fill()
      .map(() => "0")
      .join("") + binary
  );
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

// Part 3: handle variables

// Example:
// 1 ...
// 2 (LOOP)
const isGoToVariable = (instr) => instr.startsWith("(") && instr.endsWith(")");

// Example:
// 1 ...
// 2 @19
const isSimpleVariable = (instr) =>
  instr.startsWith("@") && Number(instr.slice(1)) >= 0;

const getGoToVarsTable = (instructions) => {
  /* 
    Because rows will collapse after we remove goto vars,
    actual location of goto vars will be: currentVarIndex - varsCountBeforeCurrent
    Example: 
      In:
        1 ...          -->              -->   1 ...
        2 (LOOP)       -->   2 - 0 = 2  -->   2 ... (LOOP)      
        3 ...          -->              -->   3 ...
        4 ...          -->              -->   4 ... (SOME_VAR)  
        5 (SOME_VAR)   -->   5 - 1 = 4  -->   5 ... (END)
        6 ...          -->              -->   6 ... 
        7 (END)        -->   7 - 2 = 5  -->   -----
        8 ...          -->              -->   -----

      Out: { LOOP: 2, SOME_VAR: 4, END: 5 }  
  */
  return instructions.reduce((acc, instr, currentVarIndex) => {
    const varsCountBeforeCurrent = Object.keys(acc).length;

    // Example: (LOOP) --> LOOP
    const varName = instr.slice(1).slice(0, -1);

    if (isGoToVariable(instr)) {
      return { ...acc, [varName]: currentVarIndex - varsCountBeforeCurrent };
    }

    return acc;
  }, {});
};

const getDynamicVarsTable = (
  instructions,
  predefinedVarsTable,
  gotoVarsTable
) => {
  return instructions.reduce((acc, instr) => {
    const varName = instr.slice(1);

    if (
      !isAInstruction(instr) ||
      varName in acc ||
      varName in predefinedVarsTable ||
      varName in gotoVarsTable ||
      isSimpleVariable(instr)
    ) {
      return acc;
    }

    return {
      ...acc,
      [varName]: DYNAMIC_VARS_START_POS + Object.keys(acc).length,
    };
  }, {});
};

const getVarsTable = (instructions, predefinedVarsTable) => {
  const gotoVarsTable = getGoToVarsTable(instructions);
  const dynamicVarsTable = getDynamicVarsTable(
    instructions,
    predefinedVarsTable,
    gotoVarsTable
  );

  return {
    ...predefinedVarsTable,
    ...gotoVarsTable,
    ...dynamicVarsTable,
  };
};

const removeGoToVars = (instructions) =>
  instructions.filter((instr) => !isGoToVariable(instr));

const handleVars = (instructions, predefinedVarsTable) => {
  const varsTable = getVarsTable(instructions, predefinedVarsTable);

  return removeGoToVars(instructions).map((instr) => {
    if (!isAInstruction(instr) || isSimpleVariable(instr)) {
      return instr;
    }

    return "@" + varsTable[instr.slice(1)];
  });
};

const translateFlow = (instructions) => {
  instructions = removeCommentsAndWhitespaces(instructions);
  instructions = handleVars(instructions, predefinedVarsTable);
  instructions = translateInstructions(instructions);

  return instructions;
};

export const main = () => {
  const file = process.argv.slice(2)[0];
  const fileContent = fs.readFileSync(file).toString();
  const instructions = fileContent.split("\r\n");

  const translated = translateFlow(instructions).join("\r\n");

  fs.writeFileSync(file.replace(".asm", ".hack"), translated);
};

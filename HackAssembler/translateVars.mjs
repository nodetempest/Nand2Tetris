import { isAInstruction } from "./translateInstructions.mjs";
import { DYNAMIC_VARS_START_POS } from "./constants.mjs";

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

    // (LOOP) --> LOOP
    const varName = instr.slice(1, -1);

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

const getVarsTable = (instructions) => {
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

export const translateVars = (instructions) => {
  const varsTable = getVarsTable(instructions);

  return removeGoToVars(instructions).map((instr) => {
    if (!isAInstruction(instr) || isSimpleVariable(instr)) {
      return instr;
    }

    return "@" + varsTable[instr.slice(1)];
  });
};

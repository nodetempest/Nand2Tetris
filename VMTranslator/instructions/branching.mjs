import { genId } from "../utils.mjs";

const branchingMap = {
  label: (label) => {
    return `(${label})`;
  },

  goto: (label) => {
    return [`@${label}`, "0;JMP"].join("\r\n");
  },

  "if-goto": (label) => {
    const id = genId();

    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      `@IF-GOTO_FALSE.${id}`, // D == 0 ? skip jump : jump to (label)
      "D;JEQ",
      `@${label}`,
      "0;JMP",
      `(IF-GOTO_FALSE.${id})`,
    ].join("\r\n");
  },
};

export const isBranching = (instruction) => {
  return instruction.includes("goto") || instruction.startsWith("label");
};

export const branching = (instruction) => {
  const [operation, label] = instruction.split(" ");

  return branchingMap[operation](label);
};

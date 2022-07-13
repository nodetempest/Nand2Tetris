import fs from "fs";
import path from "path";

import {
  arithmeticAndLogic,
  isArithmeticAndLogic,
} from "./instructions/arithmeticAndLogic.mjs";
import { branching, isBranching } from "./instructions/branching.mjs";
import { callFn, isFnCall } from "./instructions/callFn.mjs";
import { declFn, isFnDeclaration } from "./instructions/declFn.mjs";
import { handleReturn, isReturn } from "./instructions/handleReturn.mjs";
import { memAccess, isMemAccess } from "./instructions/memAccess.mjs";
import { prepareSysInit } from "./prepareSysInit.mjs";

const removeCommentsAndWhitespaces = (instructions) => {
  return instructions
    .map((instruction) => instruction.split("//")[0].trim())
    .filter(Boolean);
};

const translateInstructions = (instructions, fileName) => {
  return instructions.map((instruction) =>
    [
      [isArithmeticAndLogic, arithmeticAndLogic],
      [isBranching, branching],
      [isFnCall, callFn],
      [isFnDeclaration, declFn],
      [isReturn, handleReturn],
      [isMemAccess, memAccess],
    ].find(([check]) => check(instruction))[1](instruction, fileName)
  );
};

const processInstructions = (instructions, fileName) => {
  instructions = removeCommentsAndWhitespaces(instructions);
  instructions = translateInstructions(instructions, fileName);
  instructions = [prepareSysInit()].concat(instructions);

  return instructions;
};

export const main = () => {
  const pathToFileArg = path.resolve(process.argv.slice(2)[0]);
  const fileName = path.parse(pathToFileArg).name;

  const fileContent = fs.readFileSync(pathToFileArg).toString();
  const instructions = fileContent.split("\r\n");

  fs.writeFileSync(
    pathToFileArg.replace(".vm", ".asm"),
    processInstructions(instructions, fileName).join("\r\n")
  );
};

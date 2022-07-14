import {
  arithmeticAndLogic,
  isArithmeticAndLogic,
} from "./instructions/arithmeticAndLogic.mjs";
import { branching, isBranching } from "./instructions/branching.mjs";
import { callFn, isFnCall } from "./instructions/callFn.mjs";
import { declFn, isFnDeclaration } from "./instructions/declFn.mjs";
import { handleReturn, isReturn } from "./instructions/handleReturn.mjs";
import { memAccess, isMemAccess } from "./instructions/memAccess.mjs";

export const translateInstructions = (fileName) => (instructions) => {
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

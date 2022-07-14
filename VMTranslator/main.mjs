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
import { asyncWalk, isDir } from "./utils.mjs";

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

const translateFile = (file) => {
  const fileName = path.parse(file).name;
  const fileContent = fs.readFileSync(file).toString();

  let instructions = fileContent.split("\r\n");
  instructions = removeCommentsAndWhitespaces(instructions);
  instructions = translateInstructions(instructions, fileName);

  return instructions.join("\r\n");
};

export const main = async () => {
  const fileOrDir = path.resolve(process.argv.slice(2)[0]);

  let files;
  const isDirectory = isDir(fileOrDir);

  if (isDirectory) {
    files = (await asyncWalk(fileOrDir)).filter((file) => file.endsWith(".vm"));
  } else {
    files = [fileOrDir];
  }

  let translated = files.map(translateFile).join("\r\n");

  if (translated.includes("(Sys.init)")) {
    translated = [prepareSysInit(), translated].join("\r\n");
  }

  const source = path.parse(fileOrDir);

  let targetFile;

  if (isDirectory) {
    targetFile = path.resolve(source.dir, source.name, source.name + ".asm");
  } else {
    targetFile = path.resolve(source.dir, source.name + ".asm");
  }

  fs.writeFileSync(targetFile, translated);
};

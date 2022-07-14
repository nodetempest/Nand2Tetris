import fs from "fs";
import path from "path";

import { translateFile } from "./translateFile.mjs";
import { prepareSysInit } from "./prepareSysInit.mjs";
import { asyncWalk, isDir } from "./utils.mjs";

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

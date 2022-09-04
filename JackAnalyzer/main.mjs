import path from "path";

import { CompilationEngine } from "./CompilationEngine.mjs";
import { asyncWalk, isDir } from "./utils.mjs";

export const main = async () => {
  const fileOrDir = path.resolve(process.argv.slice(2)[0]);

  let files;
  const isDirectory = isDir(fileOrDir);

  if (isDirectory) {
    files = (await asyncWalk(fileOrDir)).filter((file) =>
      file.endsWith(".jack")
    );
  } else {
    files = [fileOrDir];
  }

  files.forEach((file) => {
    const source = path.parse(file);
    const targetFile = path.resolve(source.dir, source.name + ".xml");

    new CompilationEngine(file, targetFile);
  });
};

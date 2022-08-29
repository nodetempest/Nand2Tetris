import path from "path";
import { tokenizer } from "./Tokenizer.mjs";

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

  const file = files[0];

  if (file) {
    const getNextToken = tokenizer(file);
    const token = getNextToken();
    console.log(token);
  }
};

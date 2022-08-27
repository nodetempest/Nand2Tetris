import path from "path";

import { Tokenizer } from "./Tokenizer.mjs";
import { asyncWalk, isDir } from "./utils.mjs";
import { FileInput } from "./FileInput.mjs";

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
    const fin = new FileInput(file);
    const tokenizer = new Tokenizer(fin);
    tokenizer.advance();
    const token = tokenizer.getToken();
  }
};

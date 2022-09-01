import fs from "fs";
import path from "path";
import xml2js from "xml2js";

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

  files.forEach((file) => {
    const getNextToken = tokenizer(file);
    const tokens = [];
    let token = null;

    while ((token = getNextToken())) {
      tokens.push({ [token.type]: ` ${token.value} ` });
    }

    const builder = new xml2js.Builder({ headless: true });
    const xml = builder.buildObject({ tokens }) + "\r\n";

    const source = path.parse(file);
    const targetFile = path.resolve(source.dir, source.name + "T.xml");

    fs.writeFileSync(targetFile, xml);
  });
};

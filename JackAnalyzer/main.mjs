import fs from "fs";
import path from "path";
import xml2js from "xml2js";

import { Tokenizer } from "./Tokenizer.mjs";
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

  const xmlBuilder = new xml2js.Builder({ headless: true });

  files.forEach((file) => {
    const tokenizer = new Tokenizer(file);
    const tokens = [];

    while (tokenizer.hasMoreTokens()) {
      const token = tokenizer.getToken();
      tokens.push({ [token.type]: ` ${token.value} ` });
      tokenizer.advance();
    }

    const xml = xmlBuilder.buildObject({ tokens }) + "\r\n";

    const source = path.parse(file);
    const targetFile = path.resolve(source.dir, source.name + "T.xml");

    fs.writeFileSync(targetFile, xml);
  });
};

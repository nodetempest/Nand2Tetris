import path from "path";
import fs from "fs";
import xml2js from "xml2js";

import { CompilationEngine } from "./CompilationEngine.mjs";
import { CompilationEngineError } from "./errors.mjs";
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

    const xmlBuilder = new xml2js.Builder({
      headless: true,
      renderOpts: {
        pretty: true,
        indent: "  ",
        newline: "\r\n",
        allowEmpty: true,
      },
    });

    const compiler = new CompilationEngine(file);

    try {
      const compiledTree = compiler.compile();

      const xml = xmlBuilder.buildObject(compiledTree);

      fs.writeFileSync(targetFile, xml);
    } catch (error) {
      if (error instanceof CompilationEngineError) {
        console.log(`Compilation error:\r\n${error.message}`);
      } else {
        throw error;
      }
    }
  });
};

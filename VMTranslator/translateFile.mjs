import fs from "fs";
import path from "path";

import { removeCommentsAndWhitespaces } from "./removeCommentsAndWhitespaces.mjs";
import { translateInstructions } from "./translateInstructions.mjs";
import { o } from "./utils.mjs";

const translateFlow = (fileName) =>
  o(translateInstructions(fileName), removeCommentsAndWhitespaces);

export const translateFile = (file) => {
  const fileName = path.parse(file).name;
  const fileContent = fs.readFileSync(file).toString();
  const instructions = fileContent.split("\r\n");

  return translateFlow(fileName)(instructions).join("\r\n");
};

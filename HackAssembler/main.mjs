import fs from "fs";

import { removeCommentsAndWhitespaces } from "./removeCommentsAndWhitespaces.mjs";
import { translateInstructions } from "./translateInstructions.mjs";
import { translateVars } from "./translateVars.mjs";
import { compose } from "./utils.mjs";

const translateFlow = compose(
  translateInstructions,
  translateVars,
  removeCommentsAndWhitespaces
);

export const main = () => {
  const file = process.argv.slice(2)[0];
  const fileContent = fs.readFileSync(file).toString();
  const instructions = fileContent.split("\r\n");

  const translated = translateFlow(instructions).join("\r\n");

  fs.writeFileSync(file.replace(".asm", ".hack"), translated);
};

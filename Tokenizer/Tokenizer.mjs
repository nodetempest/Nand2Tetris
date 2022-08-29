import fs from "fs";

export const symbols = [
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ".",
  ".",
  ";",
  "+",
  "-",
  "*",
  "/",
  "&",
  "|",
  "<",
  ">",
  "=",
  "~",
];

export const keywords = [
  "class",
  "constructor",
  "function",
  "method",
  "field",
  "static",
  "var",
  "int",
  "char",
  "boolean",
  "void",
  "true",
  "false",
  "null",
  "this",
  "let",
  "do",
  "if",
  "else",
  "while",
  "return",
];

export const tokenTypes = {
  keyword: "keyword",
  symbol: "symbol",
  integerConstant: "integerConstant",
  stringConstant: "stringConstant",
  identifier: "identifier",
};

export const tokenizer = (file) => {
  const fileContent = fs.readFileSync(file).toString("utf-8");

  const getNextToken = () => {};

  return getNextToken;
};

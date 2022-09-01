import fs from "fs";

export const symbols = [
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ".",
  ",",
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

export const isSymbol = (value) => {
  return symbols.includes(value);
};

export const isKeyword = (value) => {
  return keywords.includes(value);
};

export const isStringConstant = (value) => {
  return value.startsWith('"') && value.endsWith('"');
};

export const isIntegerConstant = (value) => {
  return !isNaN(Number(value));
};

export const getTokenType = (value) => {
  return [
    [isStringConstant, tokenTypes.stringConstant],
    [isIntegerConstant, tokenTypes.integerConstant],
    [isSymbol, tokenTypes.symbol],
    [isKeyword, tokenTypes.keyword],
    [() => true, tokenTypes.identifier],
  ].find(([validate]) => validate(value))[1];
};

export const tokenizer = (file) => {
  let fileContent = fs.readFileSync(file).toString("utf-8");

  // clear comments
  fileContent = fileContent.replace(/(\/\/.*)|(\/\*[\s\S]*?\*\/)/g, "");

  const tokenValues = fileContent.match(
    /".*"|[{}()\[\]\.,;+\-\*\/&|<>=~]|\w+/g
  );

  let pos = 0;

  const isEmpty = () => pos >= tokenValues.length;

  const getNextToken = () => {
    if (isEmpty()) {
      return null;
    } else {
      let tokenValue = tokenValues[pos++];
      const tokenType = getTokenType(tokenValue);

      // '"hello"' --> 'hello'
      if (tokenType === tokenTypes.stringConstant) {
        tokenValue = tokenValue.slice(1, -1);
      }

      return {
        value: tokenValue,
        type: tokenType,
      };
    }
  };

  return getNextToken;
};

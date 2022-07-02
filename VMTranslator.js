const fs = require("fs");
const path = require("path");

// prettier-ignore
const calcOperationsMap = {
  add: [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; *SP = *SP + D
          "M=M-1",
          "A=M",
          "M=M+D",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  sub: [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; *SP = *SP - D
          "M=M-1",
          "A=M",
          "M=M-D",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  eq:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; D = D - *SP
          "M=M-1",
          "A=M",
          "D=D-M",
          "@DIFF_EQ_ZERO",    // D == 0 ? *SP = 1 : *SP = 0
          "D;JEQ",
          "M=0",
          "(DIFF_EQ_ZERO)",
          "M=1",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  lt:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; D = *SP - D
          "M=M-1",
          "A=M",
          "D=M-D",
          "@DIFF_IS_NEG",    // D < 0 ? *SP = 1 : *SP = 0
          "D;JLT",
          "M=0",
          "(DIFF_IS_NEG)",
          "M=1",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  gt:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; D = *SP - D
          "M=M-1",
          "A=M",
          "D=M-D",
          "@DIFF_IS_POS",    // D > 0 ? *SP = 1 : *SP = 0
          "D;JGT",
          "M=0",
          "(DIFF_IS_POS)",
          "M=1",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  le:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; D = *SP - D
          "M=M-1",
          "A=M",
          "D=M-D",
          "@DIFF_IS_POS",    // D <= 0 ? *SP = 1 : *SP = 0
          "D;JLE",
          "M=0",
          "(DIFF_IS_POS)",
          "M=1",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  ge:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; D = *SP - D
          "M=M-1",
          "A=M",
          "D=M-D",
          "@DIFF_IS_POS",    // D >= 0 ? *SP = 1 : *SP = 0
          "D;JGE",
          "M=0",
          "(DIFF_IS_POS)",
          "M=1",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  neg:   [
          "@SP",    // SP--; *SP = -(*SP)
          "M=M-1",
          "A=M",
          "M=-M",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  and:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; *SP = *SP && D
          "M=M-1",
          "A=M",
          "M=M&D",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  or:   [
          "@SP",    // SP--; D = *SP
          "M=M-1",
          "A=M",
          "D=M",
          "@SP",    // SP--; *SP = *SP || D
          "M=M-1",
          "A=M",
          "M=M|D",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),

  not:   [
          "@SP",    // SP--; *SP = !(*SP)
          "M=M-1",
          "A=M",
          "M=!M",
          "@SP",    // SP++
          "M=M+1",
        ].join("\r\n"),
};

// prettier-ignore
const createGeneralPushPopHandler = ptr => ({
  push: (value) =>  [
                      `@${value}`,    // D = *(ptr + value)
                      "D=A",
                      `@${ptr}`,
                      "A=A+D",
                      "D=M",
                      "@SP",    // *SP = D
                      "A=M",
                      "M=D",
                      "@SP",    // SP++
                      "M=M+1",
                    ].join("\r\n"),

  pop: (value) =>  [
                    `@${ptr}`,    // temp_ptr = ptr + value
                    "D=A",
                    `@${value}`,
                    "D=D+A",
                    "@temp_ptr",
                    "M=D",
                    "@SP",    // SP--
                    "M=M-1",
                    "A=M",    // D = *SP
                    "D=M",
                    "@temp_ptr",    // *temp_ptr = D
                    "A=M",
                    "M=D",
                  ].join("\r\n"),
})

// prettier-ignore
const pushPopMap = {
  constant: {
    push: (value) =>  [
                        "@SP",    // *SP = value
                        "A=M",
                        `M=${value}`,
                        "@SP",    // SP++
                        "M=M+1",
                      ].join("\r\n"),
  },

  local: createGeneralPushPopHandler("LCL"),
  argument: createGeneralPushPopHandler("ARG"),
  this: createGeneralPushPopHandler("THIS"),
  that: createGeneralPushPopHandler("THAT"),
  temp: createGeneralPushPopHandler("5"),

  pointer: {
    push: (value) =>  [
                        "@PUSH_THIS",   // value == 0 ? A = THIS : A = THAT
                        `${value};JEQ`,
                        "@THAT",
                        "(PUSH_THIS)",    // *SP = THIS/THAT
                        "@THIS",
                        "D=M",
                        "@SP",
                        "A=M",
                        "M=D",
                        "@SP",    // SP++
                        "M=M+1",
                      ].join("\r\n"),

    pop: (value) =>  [
                        "@SP",    // SP--
                        "M=M-1",   
                        "@SP",    // D = *SP
                        "A=M",
                        "D=M",
                        "@POP_THIS",    // value == 0 ? A = THIS : A = THAT
                        `${value};JEQ`,
                        "@THAT",
                        "(POP_THIS)",
                        "@THIS",
                        "M=D",    // THIS/THAT = D
                      ].join("\r\n"),
  },

  static: {
    push: (value, fileName) =>  [
                                  `@${[fileName, value].join(".")}`,    // D = @Foo.i
                                  "D=M",
                                  "@SP",    // *SP = D
                                  "A=M",
                                  "M=D",
                                  "@SP",    // SP++
                                  "M=M+1",
                                ].join("\r\n"),

    pop: (value, fileName) =>  [
                                  "@SP",    // SP--
                                  "M=M-1",
                                  "A=M",    // D = *SP
                                  "D=M",
                                  `@${[fileName, value].join(".")}`,    // @Foo.i = D
                                  "M=D",
                                ].join("\r\n"),
  },
};

const removeCommentsAndWhitespaces = (lines) => {
  return lines.map((line) => line.split("//")[0].trim()).filter(Boolean);
};

const translateInstructions = (lines, fileName) => {
  return lines.map((instruction) => {
    if (instruction in calcOperationsMap) {
      return calcOperationsMap[instruction];
    } else {
      const [stackOperation, memorySegment, value] = instruction.split(" ");

      return pushPopMap[memorySegment][stackOperation](value, fileName);
    }
  });
};

const processLines = (lines, fileName) => {
  lines = removeCommentsAndWhitespaces(lines);
  lines = translateInstructions(lines, fileName);

  return lines;
};

const main = () => {
  const pathToFileArg = path.resolve(process.argv.slice(2)[0]);
  const fileName = path.parse(pathToFileArg).name;

  const fileContent = fs.readFileSync(pathToFileArg).toString();
  const lines = fileContent.split("\r\n");

  fs.writeFileSync(
    pathToFileArg.replace(".vm", ".asm"),
    processLines(lines, fileName).join("\r\n")
  );
};

main();

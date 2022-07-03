const fs = require("fs");
const path = require("path");

const createSharedCallCounterWrapper =
  (count = 0) =>
  (fn) =>
  (...args) =>
    fn(...args.concat(count++));

const withSharedCounter = createSharedCallCounterWrapper();

// prettier-ignore
const createCompareHandler = (jumpBitName) => (count) =>
  [
    "@SP",    // SP--; D = *SP
    "M=M-1",
    "A=M",
    "D=M",
    "@SP",    // SP--; D = *SP - D
    "M=M-1",
    "A=M",
    "D=M-D",
    `@IF_TRUE.${count}`,    // D `compare` 0 ? *SP = true(-1) : *SP = false(0)
    `D;${jumpBitName}`,
    "@SP",    // false case
    "A=M",
    "M=0",
    `@IF_FALSE.${count}`,
    "0;JMP",
    `(IF_TRUE.${count})`,
    "@SP",    // true case
    "A=M",
    "M=-1",
    `(IF_FALSE.${count})`,
    "@SP",    // SP++
    "M=M+1",
  ].join("\r\n");

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
  
  compare: {
    eq: withSharedCounter(createCompareHandler("JEQ")),
    ne: withSharedCounter(createCompareHandler("JNE")),
    lt: withSharedCounter(createCompareHandler("JLT")),
    gt: withSharedCounter(createCompareHandler("JGT")),
    le: withSharedCounter(createCompareHandler("JLE")),
    ge: withSharedCounter(createCompareHandler("JGE")),
  },
};

// prettier-ignore
const createGeneralPushPopHandler = ptr => ({
  push: (value) =>  [
                      `@${value}`,    // D = *(ptr + value)
                      "D=A",
                      `@${ptr}`,
                      "A=M+D",
                      "D=M",
                      "@SP",    // *SP = D
                      "A=M",
                      "M=D",
                      "@SP",    // SP++
                      "M=M+1",
                    ].join("\r\n"),

  pop: (value) =>  [
                    `@${ptr}`,    // temp_ptr = ptr + value
                    "D=M",
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
                        `@${value}`,
                        "D=A",
                        "@SP",    // *SP = value
                        "A=M",
                        "M=D",
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
                        `@${value === "0" ? "THIS" : "THAT"}`, // *SP = THIS/THAT
                        "D=M",
                        "@SP",
                        "A=M",
                        "M=D",
                        "@SP",    // SP++
                        "M=M+1",
                      ].join("\r\n"),

    pop: (value) =>  [
                        "@SP",    // SP--; D = *SP
                        "M=M-1",   
                        "A=M",
                        "D=M",
                        `@${value === "0" ? "THIS" : "THAT"}`,    // value == 0 ? A = THIS : A = THAT
                        "M=D",    // THIS/THAT = D
                      ].join("\r\n"),
  },

  static: {
    push: (value, fileName) =>  [
                                  `@${fileName}.${value}`,    // D = @Foo.i
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
                                  `@${fileName}.${value}`,    // @Foo.i = D
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
    } else if (instruction in calcOperationsMap.compare) {
      return calcOperationsMap.compare[instruction]();
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

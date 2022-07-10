const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const genId = () => crypto.randomBytes(16).toString("hex");

const range = (n) => Array.apply(null, { length: n }).map(Number.call, Number);

const createCompareHandler = (jumpBitName) => {
  const id = genId();

  return [
    "@SP", // SP--; D = *SP
    "M=M-1",
    "A=M",
    "D=M",
    "@SP", // SP--; D = *SP - D
    "M=M-1",
    "A=M",
    "D=M-D",
    `@IF_TRUE.${id}`, // D `compare` 0 ? *SP = true(-1) : *SP = false(0)
    `D;${jumpBitName}`,
    "@SP", // false case
    "A=M",
    "M=0",
    `@IF_FALSE.${id}`,
    "0;JMP",
    `(IF_TRUE.${id})`,
    "@SP", // true case
    "A=M",
    "M=-1",
    `(IF_FALSE.${id})`,
    "@SP", // SP++
    "M=M+1",
  ].join("\r\n");
};

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
    eq: createCompareHandler("JEQ"),
    ne: createCompareHandler("JNE"),
    lt: createCompareHandler("JLT"),
    gt: createCompareHandler("JGT"),
    le: createCompareHandler("JLE"),
    ge: createCompareHandler("JGE"),
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
                    // temp ("5") should be dereferenced by "A"
                    `D=${ptr === "5" ? "A" : "M"}`,
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

// prettier-ignore
const branchingMap = {
  label: label => `(${label})`,

  goto: label =>  [
                    `@${label}`,
                    "0;JMP",
                  ].join("\r\n"),

  "if-goto": label => {
    const id = genId();

    return [
      "@SP",    // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      `@IF-GOTO_FALSE.${id}`,    // D == 0 ? skip jump : jump to (label)
      "D;JEQ",
      `@${label}`,
      "0;JMP",
      `(IF-GOTO_FALSE.${id})`,
    ].join("\r\n");
  },
}

const removeCommentsAndWhitespaces = (lines) => {
  return lines.map((line) => line.split("//")[0].trim()).filter(Boolean);
};

const setZerosToLocals = (numberOfLocals) => {
  return range(numberOfLocals).map((position) =>
    [
      "@LCL", // *(LCL + position) = 0
      "D=M",
      `@${position}`,
      "A=D+A",
      "M=0",
    ].join("\r\n")
  );
};

// prettier-ignore
const declFn = ({ name, numberOfLocals }) =>  [
                            `(${name})`,
                            "@SP",    // set LCL
                            "D=M",
                            "@LCL",
                            "M=D",
                            `@${numberOfLocals}`,   // set SP
                            "D=A",
                            "@SP",   
                            "M=M+D",
                            ...setZerosToLocals(numberOfLocals),
                          ].join("\r\n");

// prettier-ignore
const handleReturn = () => [
                        // endFrame = LCL
                        "@LCL",
                        "D=M",
                        "@endFrame",
                        "M=D",
                        // retAddr = *(endFrame - 5)
                        "@endFrame",   // D = endFrame
                        "D=M",
                        "@5",   // D = *(D - 5)
                        "A=D-A",
                        "D=M",    
                        "@retAddr",    // retAddr = D
                        "M=D",
                        // *ARG = pop()
                        "@SP",   // D = *(SP - 1)
                        "A=M-1",
                        "D=M",
                        "@ARG",   // *ARG = D
                        "A=M",
                        "M=D",
                        // SP = ARG + 1
                        "@ARG",
                        "D=M+1",
                        "@SP",
                        "M=D",
                        // THAT = *(endFrame - 1)
                        "@endFrame",    // D = *(endFrame - 1)
                        "A=M-1",
                        "D=M",
                        "@THAT",    // THAT = D
                        "M=D",
                        // THIS = *(endFrame - 2)
                        "@endFrame",    // D = *(endFrame - 2)
                        "D=M",
                        "@2",
                        "A=D-A",
                        "D=M",
                        "@THIS",    // THIS = D
                        "M=D",
                        // ARG = *(endFrame - 3)
                        "@endFrame",    // D = *(endFrame - 3)
                        "D=M",
                        "@3",
                        "A=D-A",
                        "D=M",
                        "@ARG",    // ARG = D
                        "M=D",
                        // LCL = *(endFrame - 4)
                        "@endFrame",    // D = *(endFrame - 4)
                        "D=M",
                        "@4",
                        "A=D-A",
                        "D=M",
                        "@LCL",    // LCL = D
                        "M=D",
                        // goto retAddr
                        "@retAddr",
                        "A=M",
                        "0;JMP",
                     ].join("\r\n");

// prettier-ignore
const savePtrToCallFrame = (ptr, order) => [
                            "@SP",
                            "D=M",
                            `@${order}`,
                            "D=D+A",
                            "@temp_ptr",
                            "M=D",
                            `@${ptr}`,
                            // retAddr has order of 0, save A value to D
                            `D=${order === 0 ? "A" : "M"}`,
                            "@temp_ptr",
                            "A=M",
                            "M=D",
                          ].join("\r\n");

// prettier-ignore
const callFn = (fnName, numberOfArgs) => {
  const retAddr =`${fnName}$ret.${genId()}`;

  return [
    savePtrToCallFrame(retAddr, 0),   // save pointers
    savePtrToCallFrame("LCL", 1),
    savePtrToCallFrame("ARG", 2),
    savePtrToCallFrame("THIS", 3),
    savePtrToCallFrame("THAT ", 4),
    "@SP",    // set ARG = SP - numberOfArgs
    "D=M",
    `@${numberOfArgs}`,
    "D=D-A",
    "@ARG",
    "M=D",
    "@5",   //  move SP to position next to the end of call frame
    "D=A",
    "@SP",
    "M=M+D",
    `@${fnName}`,   // goto fn
    "0;JMP",
    `(${retAddr})`,   // retAddr
  ].join("\r\n")
};

const bootstrapInit = () => {
  return [
    "@256", // SP = 256
    "D=A",
    "@SP",
    "M=D",
    "@1", // LCL = -1
    "D=-A",
    "@LCL",
    "M=D",
    "@2", // ARG = -2
    "D=-A",
    "@ARG",
    "M=D",
    "@3", // THIS = -3
    "D=-A",
    "@THIS",
    "M=D",
    "@4", // THAT = -4
    "D=-A",
    "@THAT",
    "M=D",
  ].join("\r\n");
};

const prepareSysInit = () => {
  return [bootstrapInit(), callFn("Sys.init", 0)].join("\r\n");
};

const translateInstructions = (lines, fileName) => {
  let fn = {
    name: "",
    numberOfLocals: 0,
  };

  let translatedInstructions = lines.map((instruction) => {
    if (instruction.startsWith("call")) {
      const [, fnName, numberOfArgs] = instruction.split(" ");

      return callFn(fnName, numberOfArgs);
    } else if (instruction.startsWith("function")) {
      const [, fnName, numberOfLocals] = instruction.split(" ");

      fn.name = fnName;
      fn.numberOfLocals = numberOfLocals;

      return declFn(fn);
    } else if (instruction === "return") {
      return handleReturn(fn);
    } else if (
      instruction.includes("goto") ||
      instruction.startsWith("label")
    ) {
      const [operation, label] = instruction.split(" ");

      return branchingMap[operation](label);
    } else if (instruction in calcOperationsMap) {
      return calcOperationsMap[instruction];
    } else if (instruction in calcOperationsMap.compare) {
      return calcOperationsMap.compare[instruction]();
    } else {
      const [stackOperation, memorySegment, value] = instruction.split(" ");

      return pushPopMap[memorySegment][stackOperation](value, fileName);
    }
  });

  translatedInstructions = [prepareSysInit()].concat(translatedInstructions);

  return translatedInstructions;
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

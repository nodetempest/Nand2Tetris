const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const genId = () => crypto.randomBytes(16).toString("hex");

const range = (n) => Array.apply(null, { length: n }).map(Number.call, Number);

const removeCommentsAndWhitespaces = (lines) => {
  return lines.map((line) => line.split("//")[0].trim()).filter(Boolean);
};

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

const arithmeticAndLogicMap = {
  add: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP + D
      "M=M-1",
      "A=M",
      "M=M+D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  sub: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP - D
      "M=M-1",
      "A=M",
      "M=M-D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  neg: () => {
    return [
      "@SP", // SP--; *SP = -(*SP)
      "M=M-1",
      "A=M",
      "M=-M",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  and: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP && D
      "M=M-1",
      "A=M",
      "M=M&D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  or: () => {
    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      "@SP", // SP--; *SP = *SP || D
      "M=M-1",
      "A=M",
      "M=M|D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  not: [
    "@SP", // SP--; *SP = !(*SP)
    "M=M-1",
    "A=M",
    "M=!M",
    "@SP", // SP++
    "M=M+1",
  ].join("\r\n"),

  eq: createCompareHandler("JEQ"),
  ne: createCompareHandler("JNE"),
  lt: createCompareHandler("JLT"),
  gt: createCompareHandler("JGT"),
  le: createCompareHandler("JLE"),
  ge: createCompareHandler("JGE"),
};

const createGeneralMemAccessHandler = (ptr, derefPtrBy = "M") => ({
  push: (value) => {
    return [
      `@${value}`, // D = *(ptr + value)
      "D=A",
      `@${ptr}`,
      "A=M+D",
      "D=M",
      "@SP", // *SP = D
      "A=M",
      "M=D",
      "@SP", // SP++
      "M=M+1",
    ].join("\r\n");
  },

  pop: (value) => {
    return [
      `@${ptr}`, // temp_ptr = ptr + value
      `D=${derefPtrBy}`,
      `@${value}`,
      "D=D+A",
      "@temp_ptr",
      "M=D",
      "@SP", // SP--
      "M=M-1",
      "A=M", // D = *SP
      "D=M",
      "@temp_ptr", // *temp_ptr = D
      "A=M",
      "M=D",
    ].join("\r\n");
  },
});

const memAccessMap = {
  constant: {
    push: (value) => {
      return [
        `@${value}`,
        "D=A",
        "@SP", // *SP = value
        "A=M",
        "M=D",
        "@SP", // SP++
        "M=M+1",
      ].join("\r\n");
    },
  },

  local: createGeneralMemAccessHandler("LCL"),
  argument: createGeneralMemAccessHandler("ARG"),
  this: createGeneralMemAccessHandler("THIS"),
  that: createGeneralMemAccessHandler("THAT"),
  temp: createGeneralMemAccessHandler("5", "A"),

  pointer: {
    push: (value) => {
      return [
        `@${value === "0" ? "THIS" : "THAT"}`, // *SP = THIS/THAT
        "D=M",
        "@SP",
        "A=M",
        "M=D",
        "@SP", // SP++
        "M=M+1",
      ].join("\r\n");
    },

    pop: (value) => {
      return [
        "@SP", // SP--; D = *SP
        "M=M-1",
        "A=M",
        "D=M",
        `@${value === "0" ? "THIS" : "THAT"}`, // value == 0 ? A = THIS : A = THAT
        "M=D", // THIS/THAT = D
      ].join("\r\n");
    },
  },

  static: {
    push: (value, fileName) => {
      return [
        `@${fileName}.${value}`, // D = @Foo.i
        "D=M",
        "@SP", // *SP = D
        "A=M",
        "M=D",
        "@SP", // SP++
        "M=M+1",
      ].join("\r\n");
    },

    pop: (value, fileName) => {
      return [
        "@SP", // SP--
        "M=M-1",
        "A=M", // D = *SP
        "D=M",
        `@${fileName}.${value}`, // @Foo.i = D
        "M=D",
      ].join("\r\n");
    },
  },
};

const branchingMap = {
  label: (label) => {
    return `(${label})`;
  },

  goto: (label) => {
    return [`@${label}`, "0;JMP"].join("\r\n");
  },

  "if-goto": (label) => {
    const id = genId();

    return [
      "@SP", // SP--; D = *SP
      "M=M-1",
      "A=M",
      "D=M",
      `@IF-GOTO_FALSE.${id}`, // D == 0 ? skip jump : jump to (label)
      "D;JEQ",
      `@${label}`,
      "0;JMP",
      `(IF-GOTO_FALSE.${id})`,
    ].join("\r\n");
  },
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

const declFn = (name, numberOfLocals) => {
  return [
    `(${name})`,
    "@SP", // set LCL
    "D=M",
    "@LCL",
    "M=D",
    `@${numberOfLocals}`, // set SP
    "D=A",
    "@SP",
    "M=M+D",
    ...setZerosToLocals(numberOfLocals),
  ].join("\r\n");
};

const unpackFramePtr = (ptr, relPos) => {
  return [
    // ptr = *(endFrame - relPos)
    "@endFrame", // D = *(endFrame - 2)
    "D=M",
    `@${relPos}`,
    "A=D-A",
    "D=M",
    `@${ptr}`, // ptr = D
    "M=D",
  ];
};

const handleReturn = () => {
  return [
    // endFrame = LCL
    "@LCL",
    "D=M",
    "@endFrame",
    "M=D",
    ...unpackFramePtr("retAddr", 5),
    // *ARG = pop()
    "@SP", // D = *(SP - 1)
    "A=M-1",
    "D=M",
    "@ARG", // *ARG = D
    "A=M",
    "M=D",
    // SP = ARG + 1
    "@ARG",
    "D=M+1",
    "@SP",
    "M=D",
    ...unpackFramePtr("THAT", 1),
    ...unpackFramePtr("THIS", 2),
    ...unpackFramePtr("ARG", 3),
    ...unpackFramePtr("LCL", 4),
    // goto retAddr
    "@retAddr",
    "A=M",
    "0;JMP",
  ].join("\r\n");
};

const savePtrToCallFrame = (ptr, relPos, derefPtrBy = "M") => {
  return [
    "@SP",
    "D=M",
    `@${relPos}`,
    "D=D+A",
    "@temp_ptr",
    "M=D",
    `@${ptr}`,
    `D=${derefPtrBy}`,
    "@temp_ptr",
    "A=M",
    "M=D",
  ].join("\r\n");
};

const callFn = (fnName, numberOfArgs) => {
  const retAddr = `${fnName}$ret.${genId()}`;

  return [
    savePtrToCallFrame(retAddr, 0, "A"), // save pointers
    savePtrToCallFrame("LCL", 1),
    savePtrToCallFrame("ARG", 2),
    savePtrToCallFrame("THIS", 3),
    savePtrToCallFrame("THAT ", 4),
    "@SP", // set ARG = SP - numberOfArgs
    "D=M",
    `@${numberOfArgs}`,
    "D=D-A",
    "@ARG",
    "M=D",
    "@5", //  move SP to position next to the end of call frame
    "D=A",
    "@SP",
    "M=M+D",
    `@${fnName}`, // goto fn
    "0;JMP",
    `(${retAddr})`, // retAddr
  ].join("\r\n");
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
  return lines.map((instruction) => {
    if (instruction.startsWith("call")) {
      const [, fnName, numberOfArgs] = instruction.split(" ");

      return callFn(fnName, numberOfArgs);
    } else if (instruction.startsWith("function")) {
      const [, fnName, numberOfLocals] = instruction.split(" ");

      return declFn(fnName, numberOfLocals);
    } else if (instruction === "return") {
      return handleReturn();
    } else if (
      instruction.startsWith("goto") ||
      instruction.startsWith("label")
    ) {
      const [operation, label] = instruction.split(" ");

      return branchingMap[operation](label);
    } else if (instruction in arithmeticAndLogicMap) {
      return arithmeticAndLogicMap[instruction]();
    } else {
      const [stackOperation, memorySegment, value] = instruction.split(" ");

      return memAccessMap[memorySegment][stackOperation](value, fileName);
    }
  });
};

const processInstructions = (instructions, fileName) => {
  instructions = removeCommentsAndWhitespaces(instructions);
  instructions = translateInstructions(instructions, fileName);
  instructions = [prepareSysInit()].concat(instructions);

  return instructions;
};

const main = () => {
  const pathToFileArg = path.resolve(process.argv.slice(2)[0]);
  const fileName = path.parse(pathToFileArg).name;

  const fileContent = fs.readFileSync(pathToFileArg).toString();
  const instructions = fileContent.split("\r\n");

  fs.writeFileSync(
    pathToFileArg.replace(".vm", ".asm"),
    processInstructions(instructions, fileName).join("\r\n")
  );
};

main();

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

export const isMemAccess = (instruction) => {
  return instruction.startsWith("push") | instruction.startsWith("pop");
};

export const memAccess = (instruction, fileName) => {
  const [stackOperation, memorySegment, value] = instruction.split(" ");

  return memAccessMap[memorySegment][stackOperation](value, fileName);
};

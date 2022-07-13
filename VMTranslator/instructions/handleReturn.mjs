const unpackFramePtr = (ptr, relPos) => {
  return [
    // ptr = *(endFrame - relPos)
    "@endFrame", // D = *(endFrame - relPos)
    "D=M",
    `@${relPos}`,
    "A=D-A",
    "D=M",
    `@${ptr}`, // ptr = D
    "M=D",
  ];
};

export const isReturn = (instruction) => {
  return instruction === "return";
};

export const handleReturn = () => {
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

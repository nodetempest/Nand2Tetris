import { callFn } from "./instructions/callFn.mjs";

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

export const prepareSysInit = () => {
  return [bootstrapInit(), callFn("call Sys.init 0")].join("\r\n");
};

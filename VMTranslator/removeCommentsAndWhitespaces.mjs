export const removeCommentsAndWhitespaces = (instructions) => {
  return instructions
    .map((instr) => instr.split("//")[0].trim())
    .filter(Boolean);
};

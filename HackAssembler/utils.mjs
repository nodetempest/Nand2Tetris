export const range = (n) => {
  return Array.apply(null, { length: n }).map(Number.call, Number);
};

export const o =
  (f, g) =>
  (...args) =>
    f(g(...args));

export const compose = (...fns) => fns.reduce(o);

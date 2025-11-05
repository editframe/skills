export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === "number";
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === "boolean";
};

module.exports = (wallaby) => ({
  files: ["lib/**/*.ts"],

  tests: ["lib/**/*.test.ts"],

  testFramework: "vitest",
});
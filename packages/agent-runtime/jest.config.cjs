/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        diagnostics: {
          ignoreCodes: [6059, 151002, 2564],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@agent-system/(.*)$": "<rootDir>/../../packages/$1/src/index.ts",
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^@agent-runtime/(.*)$": "<rootDir>/../src/$1",
  },
};


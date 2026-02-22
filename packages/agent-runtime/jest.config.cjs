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
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@agent-system/governance-v2/runtime/clock$": "<rootDir>/../../packages/governance-v2/src/runtime/clock.ts",
    "^@agent-system/customer-data$": "<rootDir>/../../packages/customer-data/src/index.ts",
    "^@agent-system/(.*)$": "<rootDir>/../../packages/$1/src/index.ts",
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^@agent-runtime/(.*)$": "<rootDir>/../src/$1",
  },
};


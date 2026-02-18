/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.e2e.spec.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
        diagnostics: {
          // repo-known: build/tsconfig drift is out-of-scope; tests should still run
          ignoreCodes: [6059],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^@agent-runtime/(.*)$": "<rootDir>/../../packages/agent-runtime/src/$1",
    "^@governance/(.*)$": "<rootDir>/../../packages/governance/src/$1",
    "^@agent-system/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@agent-system/agent-runtime$": "<rootDir>/../../packages/agent-runtime/src/index.ts",
    "^@agent-system/governance$": "<rootDir>/../../packages/governance/src/index.ts",
    "^@agent-system/workflow$": "<rootDir>/../../packages/workflow/src/index.ts",
    "^@agent-system/knowledge$": "<rootDir>/../../packages/knowledge/src/index.ts",
  },
};


/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/test/jest.env.setup.ts"],
  testMatch: [
    "<rootDir>/test/**/*.e2e.spec.ts",
    "<rootDir>/test/**/*.spec.ts",
    "<rootDir>/src/**/*.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
        diagnostics: {
          // repo-known: build/tsconfig drift is out-of-scope; tests should still run
          ignoreCodes: [6059, 151002, 2564, 1343],
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@agent-system|@agent-runtime|@governance|@shared)/)",
  ],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^@agent-runtime/(.*)$": "<rootDir>/../../packages/agent-runtime/src/$1",
    "^@governance/(.*)$": "<rootDir>/../../packages/governance/src/$1",
    "^@agent-system/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@agent-system/agent-runtime$": "<rootDir>/../../packages/agent-runtime/src/index.ts",
    "^@agent-system/governance$": "<rootDir>/../../packages/governance/src/index.ts",
    "^@agent-system/governance-v2$": "<rootDir>/../../packages/governance-v2/src/index.ts",
    "^@agent-system/governance-v2/runtime/clock$": "<rootDir>/../../packages/governance-v2/src/runtime/clock.ts",
    "^@agent-system/governance-v2/types/governance.types$": "<rootDir>/../../packages/governance-v2/src/types/governance.types.ts",
    "^@agent-system/customer-data$": "<rootDir>/../../packages/customer-data/src/index.ts",
    "^@agent-system/skills$": "<rootDir>/../../packages/skills/src/index.ts",
    "^@agent-system/workflow$": "<rootDir>/../../packages/workflow/src/index.ts",
    "^@agent-system/knowledge$": "<rootDir>/../../packages/knowledge/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

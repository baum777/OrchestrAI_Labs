module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>"],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../../packages/shared/src/$1",
    "^@agent-runtime/(.*)$": "<rootDir>/../../packages/agent-runtime/src/$1",
    "^@governance/(.*)$": "<rootDir>/../../packages/governance/src/$1",
    "^@agent-system/shared$": "<rootDir>/../../packages/shared/src",
    "^@agent-system/agent-runtime$": "<rootDir>/../../packages/agent-runtime/src",
    "^@agent-system/workflow$": "<rootDir>/../../packages/workflow/src",
    "^@agent-system/knowledge$": "<rootDir>/../../packages/knowledge/src",
    "^@agent-system/governance$": "<rootDir>/../../packages/governance/src",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: {
        moduleResolution: "node",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strictPropertyInitialization: false,
      },
      diagnostics: {
        ignoreCodes: [151002, 2564],
      },
    }],
  },
};


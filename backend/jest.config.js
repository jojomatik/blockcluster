module.exports = {
  rootDir: "..",
  testEnvironment:
    "<rootDir>/backend/node_modules/jest-environment-node/build/index.js",
  collectCoverage: true,
  collectCoverageFrom: [
    "backend/src/**/*.{js,ts,tsx}",
    "common/**/*.{js,ts,tsx}",
    "!backend/src/**/*.d.ts",
    "!common/**/*.d.ts",
    "!common/**/tests/**",
  ],
  coverageDirectory: "<rootDir>/backend/coverage",
  coverageProvider: "v8",
  roots: ["<rootDir>/backend/src", "<rootDir>/backend/tests", "<rootDir>/common"],
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "<rootDir>/backend/node_modules/ts-jest",
      { tsconfig: "<rootDir>/backend/tsconfig.jest.json" },
    ],
  },
};

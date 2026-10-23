const preset = require("@vue/cli-plugin-unit-jest/presets/default/jest-preset.js");

module.exports = {
  ...preset,
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage",
  coverageProvider: "v8",
  moduleFileExtensions: ["ts", "tsx", ...preset.moduleFileExtensions],
  testPathIgnorePatterns: ["<rootDir>/backend/"],
  transform: {
    ...preset.transform,
    "^.+\\.tsx?$": [
      require.resolve("babel-jest"),
      { presets: [require.resolve("@babel/preset-typescript")] },
    ],
  },
};

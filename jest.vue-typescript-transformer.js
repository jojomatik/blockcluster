// Vue script blocks keep their .vue filename, so Babel must parse TypeScript
// regardless of the file extension. Type checking remains part of the build.
module.exports = require("babel-jest").default.createTransformer({
  presets: [
    [require.resolve("@babel/preset-typescript"), { allExtensions: true }],
  ],
});

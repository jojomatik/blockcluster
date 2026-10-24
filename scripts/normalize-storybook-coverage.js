const fs = require("fs");
const path = require("path");

const reportPath = path.resolve("coverage/storybook/lcov.info");
const report = fs.readFileSync(reportPath, "utf8");
const normalized = report.replace(/^SF:(.*)$/gm, (line, source) => {
  const loaderSeparator = source.lastIndexOf("!");
  if (loaderSeparator === -1) return line;

  const file = source.slice(loaderSeparator + 1).split("?")[0];
  return `SF:${path.relative(process.cwd(), file)}`;
});

fs.writeFileSync(reportPath, normalized);

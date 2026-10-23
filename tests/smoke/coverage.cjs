const fs = require("node:fs");
const path = require("node:path");
const v8ToIstanbul = require("v8-to-istanbul");
const { createCoverageMap } = require("istanbul-lib-coverage");
const libReport = require("istanbul-lib-report");
const reports = require("istanbul-reports");
const { test: base, expect } = require("@playwright/test");

const applicationOrigin = "http://127.0.0.1:8081";
const repositoryRoot = path.resolve(process.cwd(), "../..");
const coverageByUrl = new Map();

function mergeScriptCoverage(script) {
  const existing = coverageByUrl.get(script.url);
  if (!existing) {
    coverageByUrl.set(script.url, script);
    return;
  }

  const functions = new Map(
    existing.functions.map((fn) => [
      `${fn.functionName}:${fn.ranges[0].startOffset}:${fn.ranges[0].endOffset}`,
      fn,
    ])
  );
  for (const fn of script.functions) {
    const key = `${fn.functionName}:${fn.ranges[0].startOffset}:${fn.ranges[0].endOffset}`;
    const previous = functions.get(key);
    if (!previous) {
      existing.functions.push(fn);
      functions.set(key, fn);
      continue;
    }

    const ranges = new Map(
      previous.ranges.map((range) => [
        `${range.startOffset}:${range.endOffset}`,
        range,
      ])
    );
    for (const range of fn.ranges) {
      const previousRange = ranges.get(
        `${range.startOffset}:${range.endOffset}`
      );
      if (previousRange) {
        previousRange.count += range.count;
      } else {
        previous.ranges.push(range);
      }
    }
  }
}

const test = base.extend({
  page: async ({ page }, use) => {
    const session = await page.context().newCDPSession(page);
    await session.send("Profiler.enable");
    await session.send("Profiler.startPreciseCoverage", {
      callCount: true,
      detailed: true,
    });

    try {
      await use(page);
    } finally {
      const { result } = await session.send("Profiler.takePreciseCoverage");
      for (const script of result) {
        if (
          script.url.startsWith(`${applicationOrigin}/`) &&
          script.url.endsWith(".js")
        ) {
          mergeScriptCoverage(script);
        }
      }
      await session.detach();
    }
  },
});

async function writeCoverage() {
  const coverageMap = createCoverageMap({});

  for (const [url, script] of coverageByUrl) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not fetch covered script ${url}: ${response.status}`);
    }
    const source = await response.text();
    const sourceMapPath = source.match(/[#@]\s*sourceMappingURL=([^\s]+)/)?.[1];
    if (!sourceMapPath) {
      throw new Error(`Covered script has no source map: ${url}`);
    }

    const sourceMapUrl = new URL(sourceMapPath, url);
    const sourceMapResponse = await fetch(sourceMapUrl);
    if (!sourceMapResponse.ok) {
      throw new Error(
        `Could not fetch source map ${sourceMapUrl}: ${sourceMapResponse.status}`
      );
    }
    const sourceMap = await sourceMapResponse.json();
    const converter = v8ToIstanbul(
      path.join(process.cwd(), "coverage", path.basename(new URL(url).pathname)),
      0,
      { source, sourceMap: { sourcemap: sourceMap } }
    );
    await converter.load();
    converter.applyCoverage(script.functions);
    for (const fileCoverage of Object.values(converter.toIstanbul())) {
      const sourcePath = fileCoverage.path
        .replace(/^.*blockcluster-frontend\//, "")
        .replace(/^\.\//, "")
        .replace(/\.vue\?[^/]*$/, ".vue");
      if (
        !/^(src|common)\//.test(sourcePath) ||
        !fs.existsSync(path.resolve(repositoryRoot, sourcePath))
      ) {
        continue;
      }
      fileCoverage.path = sourcePath;
      coverageMap.addFileCoverage(fileCoverage);
    }
  }

  if (coverageByUrl.size === 0) {
    throw new Error("No application JavaScript coverage was collected");
  }
  if (coverageMap.files().length === 0) {
    throw new Error("No frontend source coverage could be mapped");
  }

  const context = libReport.createContext({
    dir: path.join(process.cwd(), "coverage"),
    coverageMap,
  });
  reports.create("lcovonly").execute(context);
}

module.exports = { expect, test, writeCoverage };

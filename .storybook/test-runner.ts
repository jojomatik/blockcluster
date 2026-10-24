import type { TestRunnerConfig } from "@storybook/test-runner";
import fs from "fs";
import path from "path";

const COVERAGE_DIR = path.resolve(process.cwd(), ".nyc_output");

// The test-runner's built-in coverage merge drops `.vue` files, so the
// per-story coverage is written to disk and reported with the nyc CLI instead.
const config: TestRunnerConfig = {
  async postVisit(page, context) {
    if (process.env.STORY_COVERAGE !== "true") return;
    const coverage = await page.evaluate(
      () => (window as unknown as { __coverage__?: unknown }).__coverage__
    );
    if (!coverage) return;
    // Vue SFC script blocks are reported as `File.vue?vue&type=script&lang=ts`.
    const normalized = Object.fromEntries(
      Object.entries(
        coverage as Record<
          string,
          { path: string; inputSourceMap?: { sources: string[] } }
        >
      ).map(([file, data]) => {
        const clean = file.replace(/\?.*$/, "");
        const map = data.inputSourceMap;
        return [
          clean,
          {
            ...data,
            path: clean,
            inputSourceMap: map && { ...map, sources: [clean] },
          },
        ];
      })
    );
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(COVERAGE_DIR, `${context.id}.json`),
      JSON.stringify(normalized)
    );
  },
};

export default config;

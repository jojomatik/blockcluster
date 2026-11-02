import { defineConfig } from "@playwright/test";
import type { ChromaticConfig } from "@chromatic-com/playwright";

export default defineConfig<ChromaticConfig>({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:8081/",
    locale: "en-US",
    // Snapshots are taken explicitly at the relevant points of each test.
    disableAutoSnapshot: true,
  },
});

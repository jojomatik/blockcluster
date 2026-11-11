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
    // These values come from the build or the running Minecraft server.
    ignoreSelectors: [
      ".v-footer a[href*='/tree/']",
      ".v-footer a[href*='/releases/tag/']",
      ".project-notice h5 code",
      // Library versions change with dependency updates.
      ".v-card .v-col h5 code",
      ".apexcharts-canvas",
      ".server .server-name",
      ".server .server-executable-name",
      ".server .console-text > .v-row:first-child",
    ],
  },
});

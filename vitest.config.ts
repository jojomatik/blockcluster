import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["app/**", "server/**", "shared/**"],
      exclude: ["**/*.stories.ts"],
    },
    projects: [
      {
        resolve: {
          alias: {
            "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
          },
        },
        test: {
          name: "node",
          environment: "node",
          include: ["tests/unit/{shared,server}/**/*.spec.ts"],
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          environment: "nuxt",
          globals: true,
          setupFiles: ["./tests/unit/setup.ts"],
          include: ["tests/unit/{components,lib,pages}/**/*.spec.ts"],
          environmentOptions: {
            nuxt: {
              overrides: {
                storybook: { enabled: false },
              },
            },
          },
        },
      }),
    ],
  },
});

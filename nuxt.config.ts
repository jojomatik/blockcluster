import { getLocales } from "@jojomatik/nuxt-bundle";
import vuetifyOptions from "./vuetify-options";

export default defineNuxtConfig({
  extends: "@jojomatik/nuxt-bundle",
  app: {
    head: {
      titleTemplate: "%s - blockcluster",
    },
  },
  i18n: {
    locales: getLocales(),
    defaultLocale: "en",
    strategy: "no_prefix",
    restructureDir: ".",
    langDir: "locales",
  },
  vuetify: {
    vuetifyOptions,
  },
  // The app uses static assets and doesn't need server-side image processing.
  image: { provider: "none" },
  ogImage: { enabled: false },
  licenseModule: {
    allowedLicenses: [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "0BSD",
      "OFL-1.1",
      // apexcharts uses a custom license that is referenced by file.
      "SEE LICENSE IN LICENSE.md",
    ],
  },
  runtimeConfig: {
    public: {
      gitRef: process.env.GIT_REF ?? "",
      gitSha:
        process.env.GIT_SHA ??
        (process.env.NODE_ENV !== "production" ? "development" : ""),
    },
  },
  nitro: {
    experimental: { websocket: true },
  },
});

import { getLocales } from "@jojomatik/nuxt-bundle";
import vuetifyOptions from "./vuetify-options";

export default defineNuxtConfig({
  extends: "@jojomatik/nuxt-bundle",
  app: {
    head: {
      titleTemplate: "%s - blockcluster",
    },
  },
  faviconModule: {
    enabled: true,
  },
  i18n: {
    locales: getLocales(),
    defaultLocale: "en",
    strategy: "no_prefix",
    restructureDir: ".",
    langDir: "locales",
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL ?? "https://blockcluster.org",
  },
  sitemap: {
    zeroPrerender: true,
  },
  vuetify: {
    vuetifyOptions,
  },
  // The app uses static assets and doesn't need server-side image processing.
  image: { provider: "none" },
  ogImage: { enabled: false },
  licenseModule: {
    licenseOverrides: {
      "socket.io-client": (license) =>
        license === undefined ? "MIT" : license,
    },
    allowedLicenses: [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "0BSD",
      "OFL-1.1",
      {
        "SEE LICENSE IN LICENSE.md": ["apexcharts", "vue3-apexcharts"],
      },
      "ISC",
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

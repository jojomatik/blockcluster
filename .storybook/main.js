const path = require("path");

module.exports = {
  stories: [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    {
      name: "@storybook/addon-coverage",
      options: {
        istanbul: { exclude: ["**/*.stories.*", "**/.storybook/**"] },
      },
    },
  ],
  framework: "@storybook/vue-webpack5",
  typescript: {
    check: false,
    checkOptions: {},
  },
  webpackFinal: async (config) => {
    // Use Sass loader for vuetify components
    config.module.rules.push({
      test: /\.s([ac])ss$/,
      use: ["style-loader", "css-loader", "sass-loader"],
      include: path.resolve(__dirname, "../"),
    });

    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "../src"),
    };
    // Minifying instrumented code is very slow and unnecessary for coverage runs.
    if (process.env.STORY_COVERAGE === "true") {
      config.optimization.minimize = false;
    }
    return config;
  },
  core: {
    disableTelemetry: true,
  },
};

const path = require("path");

module.exports = {
  stories: [
    "../src/**/*.mdx",
    {
      directory: "../src/components/buttons",
      titlePrefix: "Components",
      files: "*.stories.*",
    },
    {
      directory: "../src/components",
      titlePrefix: "Components",
      files: "*.stories.*",
    },
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
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
    return config;
  },
  core: {
    disableTelemetry: true,
  },
};

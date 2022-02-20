// eslint-disable-next-line @typescript-eslint/no-var-requires
const LicenseCheckerWebpackPlugin = require("license-checker-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  transpileDependencies: ["vuetify"],
  devServer: {
    proxy: {
      "^/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
      "^/api": {
        target: "http://localhost:3001",
      },
    },
  },
  configureWebpack: {
    plugins: [
      new LicenseCheckerWebpackPlugin({
        allow: "(Apache-2.0 OR BSD-2-Clause OR BSD-3-Clause OR MIT OR 0BSD)",
        filter:
          /(^.*[/\\]node_modules[/\\]((?:@[^/\\]+[/\\])?(?:[^@/\\][^/\\]*)))/,
        emitError: true,
        outputFilename: "ThirdPartyNotices.txt",
      }),
      new CopyWebpackPlugin({ patterns: [{ from: "LICENSE" }] }),
    ],
  },
};

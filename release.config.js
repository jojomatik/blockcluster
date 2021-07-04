module.exports = {
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "angular",
        releaseRules: [
          {
            breaking: true,
            release:
              process.env.npm_package_version.split(".")[0] > 0
                ? "major"
                : "minor",
          },
        ],
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "npm version ${nextRelease.version} --allow-same-version --no-git-tag-version && cd backend && npm version ${nextRelease.version} --allow-same-version --no-git-tag-version",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: [["**/package*.json", "!node_modules/**"]],
        message:
          "release: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};

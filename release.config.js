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
          { type: "build", scope: "deps", release: "patch" },
          { type: "lang", release: "patch" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            {
              type: "feat",
              section: "Features",
              hidden: false,
            },
            {
              type: "fix",
              section: "Bug Fixes",
              hidden: false,
            },
            {
              type: "perf",
              section: "Performance Improvements",
              hidden: false,
            },
            {
              type: "lang",
              section: "Translation Updates",
              hidden: false,
            },
            {
              type: "build",
              scope: "deps",
              hidden: false,
              section: "Dependency updates",
            },
          ],
        },
      },
    ],
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
        message: "release: ${nextRelease.version}",
      },
    ],
  ],
  branches: [
    "+([0-9])?(.{+([0-9]),x}).x",
    "main",
    "next",
    "next-major",
    { name: "beta", prerelease: true },
    { name: "alpha", prerelease: true },
  ],
};

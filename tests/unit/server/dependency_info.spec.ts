import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import getDependencyInfo from "../../../server/utils/dependency_info";

const fixture = path.join(process.cwd(), ".test-dependencies");

function writePackage(name: string, metadata: object, license?: string) {
  const directory = path.join(fixture, "node_modules", name);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify(metadata),
  );
  if (license) fs.writeFileSync(path.join(directory, "LICENSE.txt"), license);
}

describe("getDependencyInfo", () => {
  afterEach(() => fs.rmSync(fixture, { recursive: true, force: true }));

  it("scans installed packages, including scoped packages, and skips missing metadata", () => {
    fs.mkdirSync(path.join(fixture, "node_modules", "@scope", "missing"), {
      recursive: true,
    });
    writePackage(
      "plain",
      {
        author: "A Person",
        repository: "https://github.com/example/plain",
        version: "2.0.0",
        license: "Apache-2.0",
      },
      "    License line\n    Second line",
    );
    writePackage("@scope/package", {
      author: { name: "Example Author" },
      repository: { url: "git+https://github.com/example/repo.git" },
      version: "1.2.3",
      license: "MIT",
    });

    const notices = getDependencyInfo(false, fixture);

    expect(notices).toHaveLength(2);
    expect(notices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "plain",
          version: "2.0.0",
          author: "A Person",
          repositoryLink: "https://github.com/example/plain",
          notice: "License line\nSecond line",
        }),
        expect.objectContaining({
          name: "@scope/package",
          version: "1.2.3",
          author: "Example Author",
          repositoryLink: "https://github.com/example/repo",
          notice: "MIT",
        }),
      ]),
    );
  });

  it("reads direct dependency names from package.json in development", () => {
    fs.mkdirSync(fixture, { recursive: true });
    fs.writeFileSync(
      path.join(fixture, "package.json"),
      JSON.stringify({
        dependencies: {
          plain: "^2.0.0",
          "@scope/package": "^1.0.0",
          absent: "*",
        },
      }),
    );
    writePackage("plain", { version: "1", license: "MIT" });
    writePackage("@scope/package", { version: "2", license: "Apache-2.0" });

    const notices = getDependencyInfo(true, fixture);

    expect(notices.map(({ name }) => name)).toEqual([
      "plain",
      "@scope/package",
    ]);
  });
});

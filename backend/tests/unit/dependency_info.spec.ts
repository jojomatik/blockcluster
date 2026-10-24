import fs from "fs";
import getDependencyInfo from "../../src/utils/dependency_info";

describe("getDependencyInfo", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("omits development and missing optional packages and maps installed package metadata", () => {
    const readFileSync = jest.spyOn(fs, "readFileSync");
    const existsSync = jest.spyOn(fs, "existsSync").mockReturnValue(false);
    const readdirSync = jest.spyOn(fs, "readdirSync");
    readFileSync.mockImplementation((path) => {
      if (path === "package-lock.json") {
        return JSON.stringify({
          packages: {
            "": {},
            "node_modules/dev-only": { dev: true },
            "node_modules/not-installed": { optional: true },
            "node_modules/scoped/package": {},
          },
        });
      }
      return JSON.stringify({
        author: { name: "Example Author" },
        repository: { url: "git+https://github.com/example/repo.git" },
        version: "1.2.3",
        license: "MIT",
      });
    });
    readdirSync.mockReturnValue(["README.md"] as never);

    const notices = getDependencyInfo();

    expect(existsSync).toHaveBeenCalledWith(
      "node_modules/not-installed/package.json"
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      name: "scoped/package",
      version: "1.2.3",
      author: "Example Author",
      repositoryLink: "https://github.com/example/repo",
      notice: "MIT",
    });
  });

  it("supports string metadata and reads the first matching license file", () => {
    jest.spyOn(fs, "readFileSync").mockImplementation((path) => {
      if (path === "package-lock.json") {
        return JSON.stringify({
          packages: { "node_modules/plain": {} },
        });
      }
      if (path === "node_modules/plain/package.json") {
        return JSON.stringify({
          author: "A Person",
          repository: "https://github.com/example/plain",
          version: "2.0.0",
          license: "Apache-2.0",
        });
      }
      return "    License line\n    Second line";
    });
    jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["README.md", "LICENCE.txt", "LICENSE"] as never);

    const [notice] = getDependencyInfo();

    expect(notice).toMatchObject({
      name: "plain",
      version: "2.0.0",
      author: "A Person",
      repositoryLink: "https://github.com/example/plain",
      notice: "License line\nSecond line",
    });
  });
});

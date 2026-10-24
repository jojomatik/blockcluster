import fs from "fs";
import commandExists from "command-exists";
import { getJavaRuntimes } from "../../src/components/java_runtime";

describe("getJavaRuntimes", () => {
  let lstatSync: jest.SpyInstance;
  let readdirSync: jest.SpyInstance<string[], [fs.PathLike]>;
  let existsSync: jest.SpyInstance;
  let spawnSyncMock: jest.SpyInstance;
  let commandExistsSync: jest.SpyInstance;

  beforeEach(() => {
    lstatSync = jest.spyOn(fs, "lstatSync");
    readdirSync = jest.spyOn(fs, "readdirSync") as unknown as jest.SpyInstance<
      string[],
      [fs.PathLike]
    >;
    existsSync = jest.spyOn(fs, "existsSync");
    spawnSyncMock = jest.spyOn(require("child_process"), "spawnSync");
    commandExistsSync = jest.spyOn(commandExists, "sync");
    lstatSync.mockImplementation(
      () =>
        ({
          isSymbolicLink: () => false,
          isDirectory: () => true,
        } as fs.Stats)
    );
    readdirSync.mockImplementation((path) => {
      if (path.toString() === "/opt") return [];
      if (path.toString().endsWith("/bin")) return ["java"];
      return ["bin"];
    });
    existsSync.mockReturnValue(true);
    spawnSyncMock.mockImplementation((command: string) => {
      if (command === "where" || command === "which") {
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(""),
        };
      }
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from("java version\nOpenJDK Runtime Environment\n"),
      };
    });
    commandExistsSync.mockImplementation((command) => command === "where");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prefers where and marks only the first valid PATH runtime as default", () => {
    spawnSyncMock.mockImplementation((command: string) => {
      if (command === "where") {
        return {
          stdout: Buffer.from(
            "/java/first/bin/java.exe\n/java/second/bin/java\n/java/first/bin/java.exe\n"
          ),
          stderr: Buffer.from(""),
        };
      }
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from("java version\nOpenJDK Runtime Environment\n"),
      };
    });

    const runtimes = getJavaRuntimes();

    expect(commandExistsSync).toHaveBeenCalledWith("where");
    expect(commandExistsSync).not.toHaveBeenCalledWith("which");
    expect(spawnSyncMock).toHaveBeenCalledWith("where", ["java"]);
    expect(runtimes).toHaveLength(2);
    expect(
      runtimes.map(({ path, name, isDefault }) => [path, name, isDefault])
    ).toEqual([
      ["/java/first", "OpenJDK Runtime Environment", true],
      ["/java/second", "OpenJDK Runtime Environment", false],
    ]);
  });

  it("falls back to which, resolves symlinks, and skips PATH duplicates when scanning /opt", () => {
    commandExistsSync.mockImplementation((command) => command === "which");
    spawnSyncMock.mockImplementation((command: string) => {
      if (command === "which") {
        return {
          stdout: Buffer.from("/usr/local/bin/java\n"),
          stderr: Buffer.from(""),
        };
      }
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from("java version\nJava Runtime\n"),
      };
    });
    lstatSync.mockImplementation((path) => {
      if (path.toString() === "/usr/local") {
        return {
          isSymbolicLink: () => true,
          isDirectory: () => false,
        } as fs.Stats;
      }
      return {
        isSymbolicLink: () => false,
        isDirectory: () => true,
      } as fs.Stats;
    });
    readdirSync.mockImplementation((path) => {
      const value = path.toString();
      if (value === "/opt") return ["jdk-21", "jdk-17"];
      if (value.endsWith("/bin")) return ["java"];
      return ["bin"];
    });
    const readlinkSync = jest
      .spyOn(fs, "readlinkSync")
      .mockReturnValue("/opt/jdk-21");

    const runtimes = getJavaRuntimes();

    expect(spawnSyncMock).toHaveBeenCalledWith("which", ["java"]);
    expect(readlinkSync).toHaveBeenCalledWith("/usr/local");
    expect(runtimes.map(({ path, isDefault }) => [path, isDefault])).toEqual([
      ["/opt/jdk-21", true],
      ["/opt/jdk-17", false],
    ]);
  });

  it("discovers valid /opt runtimes without a PATH command and ignores invalid installations", () => {
    commandExistsSync.mockReturnValue(false);
    readdirSync.mockImplementation((path) => {
      const value = path.toString();
      if (value === "/opt") return ["jdk", "not-java"];
      if (value === "/opt/jdk/bin") return ["java"];
      if (value === "/opt/not-java/bin") return ["jre"];
      return ["bin"];
    });
    existsSync.mockReturnValue(true);

    const runtimes = getJavaRuntimes();

    expect(spawnSyncMock).toHaveBeenCalledWith("/opt/jdk/bin/java", [
      "-version",
    ]);
    expect(runtimes.map(({ path, isDefault }) => [path, isDefault])).toEqual([
      ["/opt/jdk", false],
    ]);
  });
});

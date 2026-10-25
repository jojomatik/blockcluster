import fs from "node:fs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import commandExists from "../../../server/utils/command_exists";

import { getJavaRuntimes } from "../../../server/components/java_runtime";

const runtimeMocks = vi.hoisted(() => ({
  commandExists: vi.fn(),
  spawnSync: vi.fn(),
}));
vi.mock("../../../server/utils/command_exists", () => ({
  default: runtimeMocks.commandExists,
}));
vi.mock("child_process", () => ({
  default: { spawnSync: runtimeMocks.spawnSync },
  spawnSync: runtimeMocks.spawnSync,
}));

describe("getJavaRuntimes", () => {
  let lstatSync: MockInstance;
  let readdirSync: MockInstance;
  let existsSync: MockInstance;
  let spawnSyncMock: MockInstance;
  let commandExistsMock: MockInstance;

  beforeEach(() => {
    runtimeMocks.spawnSync.mockReset();
    runtimeMocks.commandExists.mockReset();
    lstatSync = vi.spyOn(fs, "lstatSync");
    readdirSync = vi.spyOn(fs, "readdirSync") as unknown as MockInstance;
    existsSync = vi.spyOn(fs, "existsSync");
    spawnSyncMock = runtimeMocks.spawnSync;
    commandExistsMock = vi.mocked(commandExists);
    lstatSync.mockImplementation(
      () =>
        ({
          isSymbolicLink: () => false,
          isDirectory: () => true,
        }) as fs.Stats,
    );
    readdirSync.mockImplementation((entry) => {
      if (entry.toString() === "/opt") return [];
      if (entry.toString().endsWith("/bin")) return ["java"];
      return ["bin"];
    });
    existsSync.mockReturnValue(true);
    spawnSyncMock.mockImplementation((command: string) => {
      if (command === "where" || command === "which") {
        return { stdout: Buffer.from(""), stderr: Buffer.from("") };
      }
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from("java version\nOpenJDK Runtime Environment\n"),
      };
    });
    commandExistsMock.mockImplementation(
      (command: string) => command === "where",
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("prefers where and marks only the first valid PATH runtime as default", () => {
    spawnSyncMock.mockImplementation((command: string) => {
      if (command === "where")
        return {
          stdout: Buffer.from(
            "/java/first/bin/java.exe\n/java/second/bin/java\n/java/first/bin/java.exe\n",
          ),
          stderr: Buffer.from(""),
        };
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from("java version\nOpenJDK Runtime Environment\n"),
      };
    });
    const runtimes = getJavaRuntimes();
    expect(commandExistsMock).toHaveBeenCalledWith("where");
    expect(commandExistsMock).not.toHaveBeenCalledWith("which");
    expect(spawnSyncMock).toHaveBeenCalledWith("where", ["java"]);
    expect(
      runtimes.map(({ path, name, isDefault }) => [path, name, isDefault]),
    ).toEqual([
      ["/java/first", "OpenJDK Runtime Environment", true],
      ["/java/second", "OpenJDK Runtime Environment", false],
    ]);
  });

  it("falls back to which, resolves symlinks, and skips PATH duplicates when scanning /opt", () => {
    commandExistsMock.mockImplementation(
      (command: string) => command === "which",
    );
    spawnSyncMock.mockImplementation((command: string) =>
      command === "which"
        ? {
            stdout: Buffer.from("/usr/local/bin/java\n"),
            stderr: Buffer.from(""),
          }
        : {
            stdout: Buffer.from(""),
            stderr: Buffer.from("java version\nJava Runtime\n"),
          },
    );
    lstatSync.mockImplementation((entry: fs.PathLike) =>
      entry.toString() === "/usr/local"
        ? ({ isSymbolicLink: () => true, isDirectory: () => false } as fs.Stats)
        : ({
            isSymbolicLink: () => false,
            isDirectory: () => true,
          } as fs.Stats),
    );
    readdirSync.mockImplementation((entry: fs.PathLike) => {
      const value = entry.toString();
      if (value === "/opt") return ["jdk-21", "jdk-17"];
      if (value.endsWith("/bin")) return ["java"];
      return ["bin"];
    });
    const readlinkSync = vi
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
    commandExistsMock.mockReturnValue(false);
    readdirSync.mockImplementation((entry: fs.PathLike) => {
      const value = entry.toString();
      if (value === "/opt") return ["jdk", "not-java"];
      if (value === "/opt/jdk/bin") return ["java"];
      if (value === "/opt/not-java/bin") return ["jre"];
      return ["bin"];
    });
    const runtimes = getJavaRuntimes();
    expect(spawnSyncMock).toHaveBeenCalledWith("/opt/jdk/bin/java", [
      "-version",
    ]);
    expect(runtimes.map(({ path, isDefault }) => [path, isDefault])).toEqual([
      ["/opt/jdk", false],
    ]);
  });
});

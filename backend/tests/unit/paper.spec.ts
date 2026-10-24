import fs from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import {
  compareVersions,
  getPaperUpdates,
  installPaperJar,
  listOldJars,
  listPaperBuilds,
  listPaperVersions,
  parsePaperJar,
  restoreOldJar,
} from "../../src/components/paper";

const JAR_BODY = "jar-content";
const SHA = createHash("sha256").update(JAR_BODY).digest("hex");

const build = (version: string, id: number, channel = "STABLE", sha = SHA) => ({
  id,
  channel,
  time: "2025-01-01T00:00:00Z",
  downloads: {
    "server:default": {
      name: `paper-${version}-${id}.jar`,
      url: `https://example.test/paper-${version}-${id}.jar`,
      checksums: { sha256: sha },
    },
  },
});

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body)));

function mockApi(builds: Record<string, unknown[]>) {
  return jest.spyOn(global, "fetch").mockImplementation((async (
    input: RequestInfo | URL
  ) => {
    const url = String(input);
    if (url.endsWith(".jar")) return new Response(JAR_BODY);
    if (url.endsWith("/projects/paper"))
      return new Response(
        JSON.stringify({
          versions: {
            "1.21": ["1.21.11", "1.21.11-rc1", "1.21.8", "1.21.10", "1.21"],
            "1.20": ["1.20.6"],
          },
        })
      );
    const match = /versions\/([^/]+)\/builds$/.exec(url);
    if (match && builds[match[1]]) return json(builds[match[1]]);
    return new Response("", { status: 404 });
  }) as typeof fetch);
}

describe("paper", () => {
  afterEach(() => jest.restoreAllMocks());

  it("parses paper jars", () => {
    expect(parsePaperJar("paper-1.21.8-60.jar")).toEqual({
      version: "1.21.8",
      build: 60,
    });
  });

  it("ignores custom jars", () => {
    expect(parsePaperJar("spigot.jar")).toBeNull();
    expect(parsePaperJar(null)).toBeNull();
  });

  it("compares versions numerically", () => {
    expect(compareVersions("1.21.10", "1.21.9")).toBeGreaterThan(0);
    expect(compareVersions("1.21", "1.21.0")).toBe(0);
  });

  describe("getPaperUpdates", () => {
    it("returns no updates for custom jars without calling the API", async () => {
      const fetchSpy = mockApi({});
      const result = await getPaperUpdates("custom.jar");
      expect(result).toEqual({ current: null, build: null, patch: null });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("finds a newer build and the newest patch with a stable build", async () => {
      mockApi({
        "1.21.8": [build("1.21.8", 60), build("1.21.8", 70)],
        "1.21.10": [build("1.21.10", 5)],
        "1.21.11": [build("1.21.11", 9, "ALPHA")],
      });
      const result = await getPaperUpdates("paper-1.21.8-60.jar");
      expect(result.build).toEqual({ version: "1.21.8", build: 70 });
      expect(result.patch).toEqual({ version: "1.21.10", build: 5 });
    });

    it("offers nothing when already up to date", async () => {
      mockApi({ "1.20.6": [build("1.20.6", 10)] });
      const result = await getPaperUpdates("paper-1.20.6-10.jar");
      expect(result.build).toBeNull();
      expect(result.patch).toBeNull();
    });

    it.each(["/projects/paper", "/versions/1.21.11/builds"])(
      "keeps a build update when the patch lookup fails at %s",
      async (failedRequest) => {
        const fetchSpy = mockApi({ "1.21.8": [build("1.21.8", 70)] });
        const respond = fetchSpy.getMockImplementation();
        if (!respond) throw new Error("Missing API mock implementation");
        fetchSpy.mockImplementation((input, init) =>
          String(input).endsWith(failedRequest)
            ? Promise.reject(new Error("lookup failed"))
            : respond(input, init)
        );

        await expect(getPaperUpdates("paper-1.21.8-60.jar")).resolves.toEqual({
          current: { version: "1.21.8", build: 60 },
          build: { version: "1.21.8", build: 70 },
          patch: null,
        });
      }
    );
  });

  describe("listing", () => {
    it("lists release versions newest first, without pre-releases", async () => {
      mockApi({});
      expect(await listPaperVersions()).toEqual([
        "1.21.11",
        "1.21.10",
        "1.21.8",
        "1.21",
        "1.20.6",
      ]);
    });

    it("lists stable builds newest first", async () => {
      mockApi({
        "1.21.8": [
          build("1.21.8", 1),
          build("1.21.8", 3, "ALPHA"),
          build("1.21.8", 2),
        ],
      });
      const builds = await listPaperBuilds("1.21.8");
      expect(builds.map((b) => b.build)).toEqual([2, 1]);
    });
  });

  describe("installPaperJar", () => {
    let dir: string;
    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-"));
    });
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it("keeps a single jar and moves old ones to oldjars", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      fs.writeFileSync(path.join(dir, "paper-1.21.8-60.jar"), "old");
      fs.writeFileSync(path.join(dir, "custom.jar"), "custom");

      const name = await installPaperJar(dir, { version: "1.21.8", build: 70 });

      expect(name).toBe("paper-1.21.8-70.jar");
      expect(fs.readdirSync(dir).filter((f) => f.endsWith(".jar"))).toEqual([
        "paper-1.21.8-70.jar",
      ]);
      expect(fs.readdirSync(path.join(dir, "oldjars")).sort()).toEqual([
        "custom.jar",
        "paper-1.21.8-60.jar",
      ]);
      expect(fs.readFileSync(path.join(dir, name), "utf8")).toBe(JAR_BODY);
    });

    it("keeps existing jars when the checksum does not match", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70, "STABLE", "0".repeat(64))] });
      fs.writeFileSync(path.join(dir, "paper-1.21.8-60.jar"), "old");

      await expect(
        installPaperJar(dir, { version: "1.21.8", build: 70 })
      ).rejects.toThrow("Checksum");

      expect(fs.readdirSync(dir)).toEqual(["paper-1.21.8-60.jar"]);
    });

    it("retains a single backup of an identical Paper build", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      const file = "paper-1.21.8-60.jar";
      fs.mkdirSync(path.join(dir, "oldjars"));
      const backup = path.join(dir, "oldjars", file);
      fs.writeFileSync(backup, JAR_BODY);
      fs.writeFileSync(path.join(dir, file), JAR_BODY);
      const originalBackup = fs.statSync(backup).ino;

      await installPaperJar(dir, { version: "1.21.8", build: 70 });

      expect(listOldJars(dir)).toEqual([file]);
      expect(fs.statSync(backup).ino).toBe(originalBackup);
      expect(fs.readFileSync(backup, "utf8")).toBe(JAR_BODY);
    });

    it.each([
      ["paper-1.21.8-60.jar", "different"],
      ["custom.jar", "different"],
      ["custom.jar", "backup"],
    ])(
      "preserves colliding archives of %s containing %s",
      async (file, body) => {
        mockApi({ "1.21.8": [build("1.21.8", 70)] });
        fs.mkdirSync(path.join(dir, "oldjars"));
        fs.writeFileSync(path.join(dir, "oldjars", file), "backup");
        const stem = file.slice(0, -4);
        fs.writeFileSync(path.join(dir, "oldjars", `${stem}.1.jar`), "earlier");
        fs.writeFileSync(path.join(dir, file), body);

        await installPaperJar(dir, { version: "1.21.8", build: 70 });

        expect(fs.readFileSync(path.join(dir, "oldjars", file), "utf8")).toBe(
          "backup"
        );
        expect(
          fs.readFileSync(path.join(dir, "oldjars", `${stem}.1.jar`), "utf8")
        ).toBe("earlier");
        expect(
          fs.readFileSync(path.join(dir, "oldjars", `${stem}.2.jar`), "utf8")
        ).toBe(body);
      }
    );

    it.each([null, "old", "different"])(
      "restores the active jar after activation fails with archive collision %s",
      async (backupBody) => {
        mockApi({ "1.21.8": [build("1.21.8", 70)] });
        const file = "paper-1.21.8-60.jar";
        fs.writeFileSync(path.join(dir, file), "old");
        if (backupBody !== null) {
          fs.mkdirSync(path.join(dir, "oldjars"));
          fs.writeFileSync(path.join(dir, "oldjars", file), backupBody);
        }
        const activationError = new Error("activation failed");
        const rename = fs.renameSync;
        jest
          .spyOn(fs, "renameSync")
          .mockImplementation((source, destination) => {
            if (String(source).endsWith(".download")) throw activationError;
            rename(source, destination);
          });

        await expect(
          installPaperJar(dir, { version: "1.21.8", build: 70 })
        ).rejects.toBe(activationError);

        expect(fs.readFileSync(path.join(dir, file), "utf8")).toBe("old");
        expect(fs.readdirSync(dir).filter((f) => f.endsWith(".jar"))).toEqual([
          file,
        ]);
        if (backupBody === "different") {
          expect(fs.readFileSync(path.join(dir, "oldjars", file), "utf8")).toBe(
            "different"
          );
        }
      }
    );

    it("rejects unknown builds", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      await expect(
        installPaperJar(dir, { version: "1.21.8", build: 1 })
      ).rejects.toThrow("not found");
    });
  });

  describe("oldjars", () => {
    let dir: string;
    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "paper-"));
    });
    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it("lists nothing without an oldjars directory", () => {
      expect(listOldJars(dir)).toEqual([]);
    });

    it("swaps the current jar with an old one", () => {
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "oldjars", "a.jar"), "A");
      fs.writeFileSync(path.join(dir, "oldjars", "notes.txt"), "x");
      fs.writeFileSync(path.join(dir, "b.jar"), "B");

      expect(listOldJars(dir)).toEqual(["a.jar"]);
      restoreOldJar(dir, "a.jar");

      expect(fs.readdirSync(dir).filter((f) => f.endsWith(".jar"))).toEqual([
        "a.jar",
      ]);
      expect(listOldJars(dir)).toEqual(["b.jar"]);
      expect(fs.readFileSync(path.join(dir, "a.jar"), "utf8")).toBe("A");
    });

    it("rejects files outside oldjars", () => {
      fs.writeFileSync(path.join(dir, "b.jar"), "B");
      expect(() => restoreOldJar(dir, "b.jar")).toThrow("not found");
      expect(() => restoreOldJar(dir, "../b.jar")).toThrow("not found");
    });

    it("restores an old jar while preserving colliding backups of the current jar", () => {
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "oldjars", "a.jar"), "A");
      fs.writeFileSync(path.join(dir, "oldjars", "b.jar"), "backup B");
      fs.writeFileSync(path.join(dir, "b.jar"), "current B");

      restoreOldJar(dir, "a.jar");

      expect(fs.readFileSync(path.join(dir, "a.jar"), "utf8")).toBe("A");
      expect(fs.readFileSync(path.join(dir, "oldjars", "b.jar"), "utf8")).toBe(
        "backup B"
      );
      expect(
        fs.readFileSync(path.join(dir, "oldjars", "b.1.jar"), "utf8")
      ).toBe("current B");
    });
  });
});

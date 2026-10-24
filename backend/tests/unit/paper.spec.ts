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

    it.each(["project metadata", "patch builds"])(
      "preserves the build update when %s lookup fails",
      async (failure) => {
        const fetchSpy = mockApi({ "1.21.8": [build("1.21.8", 70)] });
        if (failure === "project metadata") {
          fetchSpy.mockImplementationOnce(() => json([build("1.21.8", 70)]));
          fetchSpy.mockRejectedValueOnce(new Error("offline"));
        }

        await expect(getPaperUpdates("paper-1.21.8-60.jar")).resolves.toEqual({
          current: { version: "1.21.8", build: 60 },
          build: { version: "1.21.8", build: 70 },
          patch: null,
        });
      }
    );

    it("keeps the build update when looking up project versions fails", async () => {
      jest.spyOn(global, "fetch").mockImplementation((async (
        input: RequestInfo | URL
      ) => {
        const url = String(input);
        if (url.endsWith("/projects/paper"))
          return new Response("", { status: 500 });
        return json([build("1.21.8", 70)]);
      }) as typeof fetch);

      const result = await getPaperUpdates("paper-1.21.8-60.jar");

      expect(result.build).toEqual({ version: "1.21.8", build: 70 });
      expect(result.patch).toBeNull();
    });

    it("keeps the build update when looking up a newer patch build fails", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });

      const result = await getPaperUpdates("paper-1.21.8-60.jar");

      expect(result.build).toEqual({ version: "1.21.8", build: 70 });
      expect(result.patch).toBeNull();
    });

    it("offers nothing when already up to date", async () => {
      mockApi({ "1.20.6": [build("1.20.6", 10)] });
      const result = await getPaperUpdates("paper-1.20.6-10.jar");
      expect(result.build).toBeNull();
      expect(result.patch).toBeNull();
    });
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

    it.each([
      ["paper-1.21.8-60.jar", JAR_BODY, JAR_BODY, 1],
      ["paper-1.21.8-60.jar", "different", JAR_BODY, 2],
      ["custom.jar", "custom", "custom", 2],
    ])(
      "preserves backups for %s with archived %s and current %s",
      async (file, previous, current, count) => {
        mockApi({ "1.21.8": [build("1.21.8", 70)] });
        fs.mkdirSync(path.join(dir, "oldjars"));
        fs.writeFileSync(path.join(dir, "oldjars", file), previous);
        fs.writeFileSync(path.join(dir, file), current);

        await installPaperJar(dir, { version: "1.21.8", build: 70 });

        const oldJars = listOldJars(dir);
        expect(oldJars).toHaveLength(count);
        expect(fs.readFileSync(path.join(dir, "oldjars", file), "utf8")).toBe(
          previous
        );
        if (count === 2) {
          const unique = oldJars.find((name) => name !== file)!;
          expect(
            fs.readFileSync(path.join(dir, "oldjars", unique), "utf8")
          ).toBe(current);
        }
      }
    );

    it("chooses an unused archive name across repeated collisions", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "oldjars", "custom.jar"), "first");
      fs.writeFileSync(path.join(dir, "oldjars", "custom-1.jar"), "second");
      fs.writeFileSync(path.join(dir, "custom.jar"), "third");

      await installPaperJar(dir, { version: "1.21.8", build: 70 });

      expect(
        listOldJars(dir)
          .map((file) =>
            fs.readFileSync(path.join(dir, "oldjars", file), "utf8")
          )
          .sort()
      ).toEqual(["first", "second", "third"]);
    });

    it.each([null, "different backup", JAR_BODY])(
      "restores the active jar after activation fails with backup %s",
      async (backup) => {
        mockApi({ "1.21.8": [build("1.21.8", 70)] });
        const activeJar = "paper-1.21.8-60.jar";
        fs.writeFileSync(path.join(dir, activeJar), JAR_BODY);
        if (backup !== null) {
          fs.mkdirSync(path.join(dir, "oldjars"));
          fs.writeFileSync(path.join(dir, "oldjars", activeJar), backup);
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

        expect(fs.readFileSync(path.join(dir, activeJar), "utf8")).toBe(
          JAR_BODY
        );
        expect(
          fs.readdirSync(dir).filter((file) => file.endsWith(".jar"))
        ).toEqual([activeJar]);
        if (backup === "different backup")
          expect(
            fs.readFileSync(path.join(dir, "oldjars", activeJar), "utf8")
          ).toBe(backup);
      }
    );

    it("keeps existing jars when the checksum does not match", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70, "STABLE", "0".repeat(64))] });
      fs.writeFileSync(path.join(dir, "paper-1.21.8-60.jar"), "old");

      await expect(
        installPaperJar(dir, { version: "1.21.8", build: 70 })
      ).rejects.toThrow("Checksum");

      expect(fs.readdirSync(dir)).toEqual(["paper-1.21.8-60.jar"]);
    });

    it("keeps a single archived copy of an identical jar", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "paper-1.21.8-60.jar"), JAR_BODY);
      fs.writeFileSync(
        path.join(dir, "oldjars", "paper-1.21.8-60.jar"),
        JAR_BODY
      );

      await installPaperJar(dir, { version: "1.21.8", build: 70 });

      expect(fs.readdirSync(path.join(dir, "oldjars"))).toEqual([
        "paper-1.21.8-60.jar",
      ]);
    });

    it("uses a unique archive name when a jar name already has different contents", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "paper-1.21.8-60.jar"), "current");
      fs.writeFileSync(
        path.join(dir, "oldjars", "paper-1.21.8-60.jar"),
        "previous"
      );

      await installPaperJar(dir, { version: "1.21.8", build: 70 });

      expect(fs.readdirSync(path.join(dir, "oldjars")).sort()).toEqual([
        "paper-1.21.8-60-1.jar",
        "paper-1.21.8-60.jar",
      ]);
      expect(
        fs.readFileSync(
          path.join(dir, "oldjars", "paper-1.21.8-60-1.jar"),
          "utf8"
        )
      ).toBe("current");
    });

    it("restores the active jar when activating the downloaded jar fails", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      const activeJar = path.join(dir, "paper-1.21.8-60.jar");
      fs.writeFileSync(activeJar, "active");
      const activationError = new Error("activation failed");
      const renameSync = fs.renameSync;
      jest.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
        if (String(source).endsWith(".jar.download")) throw activationError;
        return renameSync.call(fs, source, destination);
      });

      await expect(
        installPaperJar(dir, { version: "1.21.8", build: 70 })
      ).rejects.toBe(activationError);

      expect(fs.readFileSync(activeJar, "utf8")).toBe("active");
    });

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

    it("preserves colliding custom backups while restoring a jar", () => {
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "oldjars", "a.jar"), "restore");
      fs.writeFileSync(path.join(dir, "oldjars", "b.jar"), "backup");
      fs.writeFileSync(path.join(dir, "b.jar"), "current");

      restoreOldJar(dir, "a.jar");

      expect(fs.readFileSync(path.join(dir, "a.jar"), "utf8")).toBe("restore");
      expect(
        listOldJars(dir)
          .map((file) =>
            fs.readFileSync(path.join(dir, "oldjars", file), "utf8")
          )
          .sort()
      ).toEqual(["backup", "current"]);
    });

    it("rejects files outside oldjars", () => {
      fs.writeFileSync(path.join(dir, "b.jar"), "B");
      expect(() => restoreOldJar(dir, "b.jar")).toThrow("not found");
      expect(() => restoreOldJar(dir, "../b.jar")).toThrow("not found");
    });
  });
});

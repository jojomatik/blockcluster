import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
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
} from "../../../server/components/paper";

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
  return vi.spyOn(global, "fetch").mockImplementation((async (
    input: RequestInfo | URL,
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
        }),
      );
    const match = /versions\/([^/]+)\/builds$/.exec(url);
    const version = match?.[1];
    if (version && builds[version]) return json(builds[version]);
    return new Response("", { status: 404 });
  }) as typeof fetch);
}

describe("paper", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses paper jars", () => {
    expect(parsePaperJar("paper-1.21.8-60.jar")).toEqual({
      version: "1.21.8",
      build: 60,
    });
  });

  it("ignores custom jars", () => {
    expect(parsePaperJar("spigot.jar")).toBeNull();
    expect(parsePaperJar(null)).toBeNull();
    expect(parsePaperJar("paper-1.21.8.1-60.jar")).toBeNull();
    expect(parsePaperJar("paper-1.021.8-60.jar")).toBeNull();
  });

  it("compares semantic versions while normalizing two-part Paper versions", () => {
    expect(compareVersions("1.21.10", "1.21.9")).toBeGreaterThan(0);
    expect(compareVersions("1.21", "1.21.0")).toBe(0);
    expect(compareVersions("1.21.8-alpha.2", "1.21.8-alpha.10")).toBeLessThan(
      0,
    );
    expect(() => compareVersions("1.21.8.1", "1.21.8")).toThrow(
      "invalid semantic versions",
    );
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

    it.each([
      ["project metadata", "/projects/paper"],
      ["patch build", "/versions/1.21.11/builds"],
    ])(
      "preserves the build update when the %s lookup fails",
      async (_failure, failedRequest) => {
        const fetchSpy = mockApi({ "1.21.8": [build("1.21.8", 70)] });
        const respond = fetchSpy.getMockImplementation();
        if (!respond) throw new Error("Missing API mock implementation");
        fetchSpy.mockImplementation((input, init) =>
          String(input).endsWith(failedRequest)
            ? Promise.reject(new Error("lookup failed"))
            : respond(input, init),
        );

        await expect(getPaperUpdates("paper-1.21.8-60.jar")).resolves.toEqual({
          current: { version: "1.21.8", build: 60 },
          build: { version: "1.21.8", build: 70 },
          patch: null,
        });
      },
    );

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
      dir = fs.mkdtempSync(path.join(process.cwd(), ".test-paper-"));
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
      {
        scenario: "identical Paper backup",
        file: "paper-1.21.8-60.jar",
        current: JAR_BODY,
        existing: { "paper-1.21.8-60.jar": JAR_BODY },
        expected: { "paper-1.21.8-60.jar": JAR_BODY },
      },
      {
        scenario: "identical custom backup",
        file: "custom.jar",
        current: "custom",
        existing: { "custom.jar": "custom" },
        expected: { "custom.jar": "custom" },
      },
      {
        scenario: "different Paper backup",
        file: "paper-1.21.8-60.jar",
        current: "current",
        existing: { "paper-1.21.8-60.jar": "previous" },
        expected: {
          "paper-1.21.8-60.jar": "previous",
          "paper-1.21.8-60-1.jar": "current",
        },
      },
      {
        scenario: "occupied custom suffix",
        file: "custom.jar",
        current: "current",
        existing: { "custom.jar": "backup", "custom-1.jar": "earlier" },
        expected: {
          "custom.jar": "backup",
          "custom-1.jar": "earlier",
          "custom-2.jar": "current",
        },
      },
      {
        scenario: "identical backup at a unique name",
        file: "paper-1.21.8-60.jar",
        current: "active",
        existing: {
          "paper-1.21.8-60.jar": "different",
          "paper-1.21.8-60-1.jar": "active",
        },
        expected: {
          "paper-1.21.8-60.jar": "different",
          "paper-1.21.8-60-1.jar": "active",
        },
      },
    ])("preserves archives for $scenario", async (testCase) => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      fs.mkdirSync(path.join(dir, "oldjars"));
      for (const [name, body] of Object.entries(testCase.existing))
        fs.writeFileSync(path.join(dir, "oldjars", name), body);
      fs.writeFileSync(path.join(dir, testCase.file), testCase.current);

      await installPaperJar(dir, { version: "1.21.8", build: 70 });

      const archives = Object.fromEntries(
        listOldJars(dir).map((name) => [
          name,
          fs.readFileSync(path.join(dir, "oldjars", name), "utf8"),
        ]),
      );
      expect(archives).toEqual(testCase.expected);
    });

    it("keeps existing jars when the checksum does not match", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70, "STABLE", "0".repeat(64))] });
      fs.writeFileSync(path.join(dir, "paper-1.21.8-60.jar"), "old");

      await expect(
        installPaperJar(dir, { version: "1.21.8", build: 70 }),
      ).rejects.toThrow("Checksum");

      expect(fs.readdirSync(dir)).toEqual(["paper-1.21.8-60.jar"]);
    });

    it("rejects unknown builds", async () => {
      mockApi({ "1.21.8": [build("1.21.8", 70)] });
      await expect(
        installPaperJar(dir, { version: "1.21.8", build: 1 }),
      ).rejects.toThrow("not found");
    });
    it.each([
      ["no collision", null, false],
      ["identical backup", "active", false],
      ["different backup", "earlier", false],
      ["failed restoration", "earlier", true],
    ])(
      "restores the active jar after activation fails with %s",
      async (_scenario, backup, failRestore) => {
        mockApi({ "1.21.8": [build("1.21.8", 70)] });
        const name = "paper-1.21.8-60.jar";
        const activeJar = path.join(dir, name);
        fs.writeFileSync(activeJar, "active");
        if (backup !== null) {
          fs.mkdirSync(path.join(dir, "oldjars"));
          fs.writeFileSync(path.join(dir, "oldjars", name), backup);
        }
        const rename = fs.renameSync;
        const activationError = new Error("activation failed");
        vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
          if (String(from).endsWith(".download")) throw activationError;
          if (failRestore && String(from).startsWith(path.join(dir, "oldjars")))
            throw new Error("restoration failed");
          return rename(from, to);
        });

        await expect(
          installPaperJar(dir, { version: "1.21.8", build: 70 }),
        ).rejects.toBe(activationError);

        if (failRestore) {
          expect(fs.existsSync(activeJar)).toBe(false);
          expect(
            fs.readFileSync(
              path.join(dir, "oldjars", "paper-1.21.8-60-1.jar"),
              "utf8",
            ),
          ).toBe("active");
        } else {
          expect(fs.readFileSync(activeJar, "utf8")).toBe("active");
          if (backup !== null && backup !== "active")
            expect(
              fs.readFileSync(path.join(dir, "oldjars", name), "utf8"),
            ).toBe(backup);
        }
      },
    );
  });

  describe("oldjars", () => {
    let dir: string;
    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(process.cwd(), ".test-paper-"));
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

    it.each([
      ["paper-1.21.8-60-1.jar", "paper-1.21.8-60.jar"],
      ["paper-1.21.8-60-12.jar", "paper-1.21.8-60.jar"],
      ["paper-1.21.8-60.jar", "paper-1.21.8-60.jar"],
      ["custom-1.jar", "custom-1.jar"],
      ["paper-custom-60-1.jar", "paper-custom-60-1.jar"],
    ])("restores %s as %s while preserving backups", (file, restoredFile) => {
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "oldjars", file), "restore");
      fs.writeFileSync(path.join(dir, restoredFile), "current");

      restoreOldJar(dir, file);

      expect(fs.readdirSync(dir).filter((f) => f.endsWith(".jar"))).toEqual([
        restoredFile,
      ]);
      expect(fs.readFileSync(path.join(dir, restoredFile), "utf8")).toBe(
        "restore",
      );
      expect(listOldJars(dir)).toEqual([restoredFile]);
      expect(
        fs.readFileSync(path.join(dir, "oldjars", restoredFile), "utf8"),
      ).toBe("current");
      if (file.startsWith("paper-1.21.8-60"))
        expect(parsePaperJar(restoredFile)).toEqual({
          version: "1.21.8",
          build: 60,
        });
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
            fs.readFileSync(path.join(dir, "oldjars", file), "utf8"),
          )
          .sort(),
      ).toEqual(["backup", "current"]);
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
        "backup B",
      );
      expect(
        fs.readFileSync(path.join(dir, "oldjars", "b-1.jar"), "utf8"),
      ).toBe("current B");
    });
    it("preserves a colliding archive while restoring another jar", () => {
      fs.mkdirSync(path.join(dir, "oldjars"));
      fs.writeFileSync(path.join(dir, "b.jar"), "active");
      fs.writeFileSync(path.join(dir, "oldjars", "b.jar"), "earlier");
      fs.writeFileSync(path.join(dir, "oldjars", "a.jar"), "restore");

      restoreOldJar(dir, "a.jar");

      expect(fs.readFileSync(path.join(dir, "a.jar"), "utf8")).toBe("restore");
      expect(fs.readFileSync(path.join(dir, "oldjars", "b.jar"), "utf8")).toBe(
        "earlier",
      );
      expect(
        fs.readFileSync(path.join(dir, "oldjars", "b-1.jar"), "utf8"),
      ).toBe("active");
    });
  });
});

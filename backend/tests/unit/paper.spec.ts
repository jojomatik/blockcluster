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
  });
});

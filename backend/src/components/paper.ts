import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createHash } from "crypto";

const API = "https://fill.papermc.io/v3/projects/paper";

/**
 * The version and build of a PaperMC jar.
 */
export interface PaperJarInfo {
  version: string;
  build: number;
}

/**
 * Update options available for a server running PaperMC.
 */
export interface PaperUpdates {
  current: PaperJarInfo | null;
  /** The newest build of the current version, if newer than the current one. */
  build: PaperJarInfo | null;
  /** The newest build of the newest patch of the current minor version, if newer than the current patch. */
  patch: PaperJarInfo | null;
}

interface PaperBuild {
  id: number;
  channel: string;
  downloads: Record<
    string,
    { name: string; url: string; checksums: { sha256: string } }
  >;
}

/**
 * Parses the version and build from a jar named like `paper-1.21.8-60.jar`.
 * Returns `null` for any other (custom) jar.
 */
export function parsePaperJar(file: string | null): PaperJarInfo | null {
  const match = /^paper-(\d+(?:\.\d+)+)-(\d+)\.jar$/.exec(file ?? "");
  return match ? { version: match[1], build: parseInt(match[2]) } : null;
}

/**
 * Compares two dotted versions numerically.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "blockcluster" },
  });
  if (!response.ok)
    throw new Error(`Request to ${url} failed: ${response.status}`);
  return (await response.json()) as T;
}

async function getLatestStableBuild(
  version: string
): Promise<PaperBuild | null> {
  const builds = await getJson<PaperBuild[]>(
    `${API}/versions/${encodeURIComponent(version)}/builds`
  );
  return (
    builds
      .filter((build) => build.channel === "STABLE")
      .sort((a, b) => b.id - a.id)[0] ?? null
  );
}

/**
 * Determines the available updates for the given jar.
 */
export async function getPaperUpdates(
  jar: string | null
): Promise<PaperUpdates> {
  const current = parsePaperJar(jar);
  const result: PaperUpdates = { current, build: null, patch: null };
  if (!current) return result;

  const latest = await getLatestStableBuild(current.version).catch(() => null);
  if (latest && latest.id > current.build)
    result.build = { version: current.version, build: latest.id };

  try {
    const minor = current.version.split(".").slice(0, 2).join(".");
    const project = await getJson<{ versions: Record<string, string[]> }>(API);
    const newer = (project.versions[minor] ?? [])
      .filter(
        (v) =>
          /^\d+(\.\d+)+$/.test(v) && compareVersions(v, current.version) > 0
      )
      .sort((a, b) => compareVersions(b, a));
    for (const version of newer) {
      const build = await getLatestStableBuild(version);
      if (build) {
        result.patch = { version, build: build.id };
        break;
      }
    }
  } catch {
    return result;
  }
  return result;
}

/**
 * Moves all jars in `dir` into `dir/oldjars`.
 * Returns each original file name's archive path for rollback.
 */
function archiveJars(dir: string): Map<string, string> {
  const oldDir = path.join(dir, "oldjars");
  const archived = new Map<string, string>();
  for (const file of fs.readdirSync(dir)) {
    const source = path.join(dir, file);
    if (file.endsWith(".jar") && fs.lstatSync(source).isFile()) {
      fs.mkdirSync(oldDir, { recursive: true });
      let destination = path.join(oldDir, file);
      if (
        fs.existsSync(destination) &&
        parsePaperJar(file) &&
        fs.lstatSync(destination).isFile() &&
        createHash("sha256").update(fs.readFileSync(source)).digest("hex") ===
          createHash("sha256")
            .update(fs.readFileSync(destination))
            .digest("hex")
      ) {
        fs.unlinkSync(source);
      } else {
        let suffix = 1;
        while (fs.existsSync(destination)) {
          destination = path.join(
            oldDir,
            `${file.slice(0, -4)}-${suffix++}.jar`
          );
        }
        fs.renameSync(source, destination);
      }
      archived.set(file, destination);
    }
  }
  return archived;
}

/**
 * Returns the names of the jars in `dir/oldjars`.
 */
export function listOldJars(dir: string): string[] {
  try {
    return fs
      .readdirSync(path.join(dir, "oldjars"))
      .filter((file) => file.endsWith(".jar"))
      .sort();
  } catch (e) {
    return [];
  }
}

/**
 * Makes a jar from `dir/oldjars` the active one. The current jar is moved to `oldjars`.
 */
export function restoreOldJar(dir: string, file: string): void {
  if (!listOldJars(dir).includes(file))
    throw new Error("Jar not found in oldjars.");
  // Park the jar first, in case the current jar has the same name.
  const parked = path.join(dir, file + ".restore");
  fs.renameSync(path.join(dir, "oldjars", file), parked);
  try {
    archiveJars(dir);
  } finally {
    fs.renameSync(parked, path.join(dir, file));
  }
}

/**
 * Downloads the given Paper build into `dir` and moves all other jars into `dir/oldjars`.
 *
 * @return the file name of the new jar.
 */
export async function installPaperJar(
  dir: string,
  target: PaperJarInfo
): Promise<string> {
  const builds = await getJson<PaperBuild[]>(
    `${API}/versions/${encodeURIComponent(target.version)}/builds`
  );
  const build = builds.find((b) => b.id === target.build);
  const download = build?.downloads["server:default"];
  if (!download || !/^[\w.-]+\.jar$/.test(download.name))
    throw new Error("Requested Paper build not found.");

  const tmpFile = path.join(dir, download.name + ".download");
  try {
    const response = await fetch(download.url);
    if (!response.ok || !response.body)
      throw new Error("Download failed: " + response.status);
    const hash = createHash("sha256");
    const source = Readable.fromWeb(response.body as never);
    source.on("data", (chunk) => hash.update(chunk));
    await pipeline(source, fs.createWriteStream(tmpFile));
    if (hash.digest("hex") !== download.checksums.sha256)
      throw new Error("Checksum mismatch for downloaded jar.");
  } catch (e) {
    fs.rmSync(tmpFile, { force: true });
    throw e;
  }

  const activeJar = fs
    .readdirSync(dir)
    .find(
      (file) =>
        file.endsWith(".jar") && fs.lstatSync(path.join(dir, file)).isFile()
    );
  const archived = archiveJars(dir);
  try {
    fs.renameSync(tmpFile, path.join(dir, download.name));
  } catch (error) {
    const previousJar = activeJar && archived.get(activeJar);
    if (previousJar && fs.existsSync(previousJar)) {
      try {
        fs.renameSync(previousJar, path.join(dir, activeJar));
      } catch {
        // Keep the activation error if restoring the backup also fails.
      }
    }
    throw error;
  }
  return download.name;
}

/**
 * Returns all release versions of Paper, newest first.
 */
export async function listPaperVersions(): Promise<string[]> {
  const project = await getJson<{ versions: Record<string, string[]> }>(API);
  return Object.values(project.versions)
    .flat()
    .filter((v) => /^\d+(\.\d+)+$/.test(v))
    .sort((a, b) => compareVersions(b, a));
}

/**
 * Returns the stable builds of a Paper version, newest first.
 */
export async function listPaperBuilds(
  version: string
): Promise<{ build: number; time: string }[]> {
  const builds = await getJson<(PaperBuild & { time: string })[]>(
    `${API}/versions/${encodeURIComponent(version)}/builds`
  );
  return builds
    .filter((b) => b.channel === "STABLE")
    .sort((a, b) => b.id - a.id)
    .map((b) => ({ build: b.id, time: b.time }));
}

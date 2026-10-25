/*
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Notice from "#shared/components/software_notice";

/**
 * Returns the directory containing the `node_modules` of the production build (`.output/server`).
 *
 * This directory is found by traversing the parent directories of this file.
 */
function findOutputDirectory(): string | undefined {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  while (path.dirname(directory) !== directory) {
    if (fs.existsSync(path.join(directory, "node_modules"))) return directory;
    directory = path.dirname(directory);
  }
}

/**
 * Returns the paths of all installed production dependencies.
 *
 * The production build bundles all dependencies it needs in `node_modules` next to the server. During development only the direct dependencies listed in the `package.json` are returned.
 *
 * @param development whether the backend runs in development mode.
 */
function getDependencyPaths(
  development: boolean,
  rootDirectory?: string,
): string[] {
  const paths: string[] = [];

  if (development) {
    const packageJsonPath = rootDirectory
      ? path.join(rootDirectory, "package.json")
      : "package.json";
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, { encoding: "utf8" }),
    );
    for (const name of Object.keys(packageJson["dependencies"] ?? {})) {
      paths.push(path.join(rootDirectory ?? ".", "node_modules", name));
    }
    return paths;
  }

  const outputDirectory = rootDirectory ?? findOutputDirectory();
  if (!outputDirectory) return paths;
  const nodeModules = path.join(outputDirectory, "node_modules");
  for (const entry of fs.readdirSync(nodeModules)) {
    if (entry.startsWith(".")) continue;
    if (entry.startsWith("@")) {
      for (const scoped of fs.readdirSync(path.join(nodeModules, entry))) {
        paths.push(path.join(nodeModules, entry, scoped));
      }
    } else paths.push(path.join(nodeModules, entry));
  }
  return paths;
}

/**
 * Returns the dependency info for all backend dependencies.
 *
 * @param development whether the backend runs in development mode.
 * @param rootDirectory optional package root used to locate `package.json` and `node_modules`.
 */
export default function getDependencyInfo(
  development: boolean = import.meta.dev === true,
  rootDirectory?: string,
) {
  const dependencies: Notice[] = [];

  // Loop through all packages.
  for (const packagePath of getDependencyPaths(development, rootDirectory)) {
    if (!fs.existsSync(packagePath + "/package.json")) continue;

    // Retrieve title from path.
    const title = packagePath
      .replace(/^.*node_modules[\\/]/, "")
      .replace(/\\/g, "/");

    // Get package information from `package.json` in respective folder in `node_modules`.
    const currentPackageInfo: {
      author: { name: string } | string;
      repository: { url: string } | string;
      version: string;
      license: string;
    } = JSON.parse(
      fs.readFileSync(packagePath + "/package.json", { encoding: "utf8" }),
    );

    const authorObject = currentPackageInfo["author"];
    // Get name of author, if available. Otherwise get author object as string.
    const author: string =
      authorObject && (authorObject as { name: string })["name"]
        ? (authorObject as { name: string })["name"]
        : (authorObject as string);
    const repositoryObject = currentPackageInfo["repository"];
    // Get url of repository, if available. Otherwise get repository object as string.
    const repository =
      repositoryObject && (repositoryObject as { url: string })["url"]
        ? (repositoryObject as { url: string })["url"]
        : (repositoryObject as string);
    const version = currentPackageInfo["version"];

    // Find license.
    let licenseText;
    for (const file of fs.readdirSync(packagePath)) {
      if (
        file.toLowerCase().startsWith("license") ||
        file.toLowerCase().startsWith("licence")
      ) {
        licenseText = fs.readFileSync(packagePath + "/" + file, {
          encoding: "utf8",
        });
        // Remove padding with 4 spaces.
        licenseText = licenseText.replace(/ {4}/g, "");
        break;
      }
    }
    if (!licenseText) licenseText = currentPackageInfo["license"];

    dependencies.push(
      new Notice(title, version, author, repository, licenseText),
    );
  }

  return dependencies;
}

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
import Notice from "../../../common/components/software_notice";

/**
 * Returns the dependency info for all backend dependencies.
 */
export default function getDependencyInfo() {
  type PackageInfo = {
    author?: { name: string } | string;
    repository?: { url: string } | string;
    version: string;
    license?: string;
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  const projectDirectory = process.cwd();
  const nodeModulesDirectory = path.join(projectDirectory, "node_modules");
  const packageJson: PackageInfo = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, "package.json"), "utf8")
  );
  const dependencies: Notice[] = [];
  const visitedPackages = new Set<string>();

  function resolvePackage(
    name: string,
    fromDirectory: string
  ): { directory: string; info: PackageInfo } | undefined {
    let directory = fromDirectory;
    const packagePath = name.split("/");

    while (true) {
      const candidateDirectory = path.join(
        directory,
        "node_modules",
        ...packagePath
      );
      const packageJsonPath = path.join(candidateDirectory, "package.json");

      if (fs.existsSync(packageJsonPath)) {
        return {
          directory: candidateDirectory,
          info: JSON.parse(fs.readFileSync(packageJsonPath, "utf8")),
        };
      }

      if (directory === projectDirectory) return undefined;
      directory = path.dirname(directory);
    }
  }

  function addDependency(
    name: string,
    fromDirectory: string,
    optional: boolean
  ): void {
    const resolvedPackage = resolvePackage(name, fromDirectory);
    if (!resolvedPackage) {
      if (optional) return;
      throw new Error(`Could not resolve production dependency "${name}"`);
    }

    const { directory, info } = resolvedPackage;
    if (visitedPackages.has(directory)) return;
    visitedPackages.add(directory);

    const title = path
      .relative(nodeModulesDirectory, directory)
      .split(path.sep)
      .join("/");
    const author =
      typeof info.author === "object" ? info.author?.name : info.author;
    const repository =
      typeof info.repository === "object"
        ? info.repository?.url
        : info.repository;

    let licenseText;
    for (const file of fs.readdirSync(directory)) {
      if (
        file.toLowerCase().startsWith("license") ||
        file.toLowerCase().startsWith("licence")
      ) {
        licenseText = fs.readFileSync(path.join(directory, file), "utf8");
        licenseText = licenseText.replace(/ {4}/g, "");
        break;
      }
    }
    if (!licenseText) licenseText = info.license;

    dependencies.push(
      new Notice(
        title,
        info.version,
        author ?? "",
        repository ?? "",
        licenseText ?? ""
      )
    );

    for (const dependency of Object.keys(info.dependencies ?? {})) {
      addDependency(dependency, directory, false);
    }
    for (const dependency of Object.keys(info.optionalDependencies ?? {})) {
      addDependency(dependency, directory, true);
    }
  }

  for (const dependency of Object.keys(packageJson.dependencies ?? {})) {
    addDependency(dependency, projectDirectory, false);
  }
  for (const dependency of Object.keys(packageJson.optionalDependencies ?? {})) {
    addDependency(dependency, projectDirectory, true);
  }

  return dependencies;
}

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
import Notice from "../../../common/components/software_notice";

/**
 * Returns the dependency info for all backend dependencies.
 */
export default function getDependencyInfo() {
  // Parse `package-lock.json` as JSON.
  const packageLockJson = JSON.parse(
    fs.readFileSync("package-lock.json", {
      encoding: "utf8",
    })
  );

  // Retrieve all packages.
  const packages: { dev: true }[] = packageLockJson["packages"];

  const dependencies: Notice[] = [];

  // Loop through all packages.
  for (const path in packages) {
    const currentPackage = packages[path];
    // Ignore dev-dependencies.
    if (!path || currentPackage["dev"] === true) continue;

    // Retrieve title from path.
    const title = path.replace("node_modules/", "");

    // Get package information from `package.json` in respective folder in `node_modules`.
    const currentPackageInfo: {
      author: { name: string } | string;
      repository: { url: string } | string;
      version: string;
      license: string;
    } = JSON.parse(
      fs.readFileSync(path + "/package.json", { encoding: "utf8" })
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
    for (const file of fs.readdirSync(path)) {
      if (
        file.toLowerCase().startsWith("license") ||
        file.toLowerCase().startsWith("licence")
      ) {
        licenseText = fs.readFileSync(path + "/" + file, { encoding: "utf8" });
        // Remove padding with 4 spaces.
        licenseText = licenseText.replace(/ {4}/g, "");
        break;
      }
    }
    if (!licenseText) licenseText = currentPackageInfo["license"];

    dependencies.push(
      new Notice(title, version, author, repository, licenseText)
    );
  }

  return dependencies;
}

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
import { spawnSync } from "child_process";
import JavaRuntime from "../../../common/components/java_runtime";
import commandExists from "command-exists";

/**
 * The directory that contains all java installations in the official docker build.
 */
const optDir = "/opt";

/**
 * The name of the `bin`-directory inside the java runtime directory.
 */
const bin = "bin";

/**
 * The name of the `java`-command inside the `bin` directory.
 */
const java = "java";

/**
 * The name of the `which` command used to retrieve the path of a program under linux.
 */
const which = "which";

/**
 * The name of the `where` command used to retrieve the path of a program under windows.
 */
const where = "where";

/**
 * Returns whether a path is a java runtime directory by checking for the `bin/java`-program inside the directory.
 * @param path the path that should be checked.
 */
function isJavaDir(path: string): boolean {
  const isDir: boolean = fs.lstatSync(path).isDirectory();
  const hasBin = fs.readdirSync(path).includes(bin);
  const hasJava: boolean = fs
    .readdirSync(path + "/" + bin)
    .map((file) => file.substr(0, 4)) // ignore file type
    .includes(java);
  return isDir && hasBin && hasJava;
}

/**
 * Returns a {@link JavaRuntime} object for a path.
 * @param path the path to the root of the java runtime.
 */
function getRuntime(path: string): JavaRuntime {
  const command = spawnSync(path + "/" + bin + "/" + java, ["-version"]);
  const name = command.stderr.toString().split("\n")[1];
  return new JavaRuntime(path, name);
}

/**
 * Returns a list of all discoverable {@link JavaRuntime}s.
 *
 * Uses the `where`-/ `which`-command to retrieve all/ the primary runtime in the `PATH` environment variable and resolves symbolic links if necessary. The first runtime listed will be used as the default runtime.
 *
 * Searches the `/opt` directory for further java runtimes.
 */
export function getJavaRuntimes(): JavaRuntime[] {
  const runtimes: JavaRuntime[] = [];

  // Get available `where`-/ `which`-command.
  let cmd;
  if (commandExists.sync(where)) {
    cmd = spawnSync(where, [java]);
  } else if (commandExists.sync(which)) {
    cmd = spawnSync(which, [java]);
  }

  const checkedPaths: string[] = [];

  if (cmd !== undefined) {
    // Get `java` runtimes found by `where`-/ `which`-command.
    const paths: string[] = cmd.stdout.toString().split("\n");
    // Remove empty line.
    paths.pop();
    for (let path of paths) {
      // Get root directory of java runtime.
      path = path.replace(
        new RegExp(/[\\/]bin[\\/]java(?:.[a-z]{1,3}\r?)?$/),
        ""
      );
      // Resolve symbolic links.
      while (fs.lstatSync(path).isSymbolicLink()) path = fs.readlinkSync(path);

      // Check if directory is a java runtime and add to list.
      if (!checkedPaths.includes(path)) {
        checkedPaths.push(path);
        if (isJavaDir(path)) {
          const runtime: JavaRuntime = getRuntime(path);
          if (runtimes.length === 0) runtime.isDefault = true;
          runtimes.push(runtime);
        }
      }
    }
  }

  // Scan `/opt` directory for java runtimes.
  if (fs.existsSync(optDir))
    for (const file of fs.readdirSync(optDir)) {
      const path = optDir + "/" + file;
      if (!checkedPaths.includes(path) && isJavaDir(path)) {
        runtimes.push(getRuntime(path));
      }
    }

  return runtimes;
}

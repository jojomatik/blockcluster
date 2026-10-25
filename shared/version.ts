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

/**
 * A regular Expression that matches git ref's that are tags.
 */
const VERSION_REGEXP = new RegExp("(?<=refs\\/tags\\/).*");

/**
 * Returns the current version, either a release version (e.g. `v0.1.0`) or a short commit SHA.
 *
 * @param ref the git ref the software was built from (e.g. `refs/tags/v0.1.0`).
 * @param sha the git commit SHA the software was built from.
 */
export function getVersion(ref?: string, sha?: string): string {
  let match;
  if (ref !== undefined && (match = ref.match(VERSION_REGEXP)) !== null) {
    return match[0];
  } else if (sha !== undefined) {
    return sha.substring(0, 7);
  } else {
    throw new Error("Error retrieving current revision.");
  }
}

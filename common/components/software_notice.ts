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
 * A notice block of a software with basic information on the software.
 */
export default class Notice {
  /**
   * The name of the software.
   */
  name: string;

  /**
   * The version of the software.
   */
  version: string;

  /**
   * The author of the software.
   */
  author: string;

  /**
   * The link to the repository of the software.
   */
  repositoryLink?: string;

  /**
   * The notice file of the software.
   */
  notice: string;

  /**
   * Creates a notice block of a software with basic information.
   * @param name the name of the software.
   * @param version the version of the software.
   * @param author the author of the software.
   * @param repositoryLink the link to the repository of the software.
   * @param notice the notice file of the software.
   */
  constructor(
    name: string,
    version: string,
    author: string,
    repositoryLink: string,
    notice: string
  ) {
    this.name = name;
    this.version = version;
    this.author = author;

    if (repositoryLink) {
      // Normalize github URL:
      // 1. Remove `[...]github.com` prefix with protocol etc., if present.
      // 2. Remove `.git` suffix, if present.
      const repositoryCoordinates = repositoryLink
        .replace(/.+?(github.com\/)/, "")
        .replace(".git", "");

      // 3. Prepend `https://github.com/`.
      this.repositoryLink = "https://github.com/" + repositoryCoordinates;

      // If author is not set, retrieve author from repository coordinates.
      if (!this.author) this.author = repositoryCoordinates.split("/")[0];
    }

    this.notice = notice;
  }
}

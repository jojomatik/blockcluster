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

import { getDefaultRuntime } from "../../../common/components/java_runtime";
import { getJavaRuntimes } from "./java_runtime";

/**
 * A class that represents the config file of a server.
 */
export default class ServerConfig {
  /**
   * The flags of the server.
   */
  public flags: string[];

  /**
   * Whether the server should start with the backend or not.
   */
  public autostart: boolean;

  /**
   * The path to the java runtime used to run the server.
   */
  public javaPath: string;

  /**
   * Creates a new {@link ServerConfig}
   * @param flags the flags of the server, default = `[]`
   * @param autostart whether the server should start with the backend or not.
   * @param javaPath the path to the java runtime used to run the server.
   */
  constructor(
    flags: string[] = [],
    autostart = false,
    javaPath: string = getDefaultRuntime(getJavaRuntimes()).path
  ) {
    this.flags = flags;
    this.autostart = autostart;
    this.javaPath = javaPath;
  }
}

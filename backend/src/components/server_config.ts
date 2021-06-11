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
 * A class that represents the config file of a server.
 */
export default class ServerConfig {
  /**
   * The flags of the server.
   */
  public flags: string[];

  /**
   * Whether or not the server should start with the backend.
   */
  public autostart: boolean;

  /**
   * Creates a new {@link ServerConfig}
   * @param flags the flags of the server, default = `[]`
   * @param autostart whether or not the server should start with the backend.
   */
  constructor(flags: string[] = [], autostart = false) {
    this.flags = flags;
    this.autostart = autostart;
  }
}

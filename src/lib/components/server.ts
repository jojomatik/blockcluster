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
import CommonServer from "../../../common/components/server";

/**
 * The client side implementation of {@link CommonServer} with additional methods that won't run on the client side.
 */
export default class Server extends CommonServer {
  async sendAction(
    action: string,
    encodedName = encodeURIComponent(this.name)
  ) {
    return fetch(`/api/servers/${encodedName}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  async sendCommand(
    command: string,
    encodedName = encodeURIComponent(this.name)
  ) {
    return fetch(`/api/servers/${encodedName}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
  }

  async updateConfig(
    config: Record<string, unknown>,
    encodedName = encodeURIComponent(this.name)
  ) {
    return fetch(`/api/servers/${encodedName}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  async fetchInfo(encodedName = encodeURIComponent(this.name)) {
    const response = await fetch(`/api/servers/${encodedName}`);
    return response.json();
  }

  async fetchMessages(encodedName = encodeURIComponent(this.name)) {
    const response = await fetch(`/api/servers/${encodedName}/messages`);
    return response.json();
  }
}

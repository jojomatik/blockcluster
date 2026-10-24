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
  private async request(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(
        `Request failed (${response.status} ${response.statusText})`
      );
    }
    return response;
  }

  sendAction(action: string, encodedName = encodeURIComponent(this.name)) {
    return this.request(`/api/servers/${encodedName}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  }

  acceptEula(encodedName = encodeURIComponent(this.name)) {
    return this.request(`/api/servers/${encodedName}/eula`, {
      method: "POST",
    });
  }

  sendCommand(command: string, encodedName = encodeURIComponent(this.name)) {
    return this.request(`/api/servers/${encodedName}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
  }

  updateConfig(
    config: Record<string, unknown>,
    encodedName = encodeURIComponent(this.name)
  ) {
    return this.request(`/api/servers/${encodedName}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  async fetchUpdates(encodedName = encodeURIComponent(this.name)) {
    const response = await this.request(`/api/servers/${encodedName}/updates`);
    return response.json();
  }

  installUpdate(
    type: "build" | "patch",
    encodedName = encodeURIComponent(this.name)
  ) {
    return this.request(`/api/servers/${encodedName}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  }

  installVersion(
    version: string,
    build: number,
    encodedName = encodeURIComponent(this.name)
  ) {
    return this.request(`/api/servers/${encodedName}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "version", version, build }),
    });
  }

  installExistingJar(
    file: string,
    encodedName = encodeURIComponent(this.name)
  ) {
    return this.request(`/api/servers/${encodedName}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "existing", file }),
    });
  }

  async fetchOldJars(
    encodedName = encodeURIComponent(this.name)
  ): Promise<string[]> {
    const response = await this.request(`/api/servers/${encodedName}/oldjars`);
    return response.json();
  }

  async fetchPaperVersions(): Promise<string[]> {
    const response = await this.request("/api/paper/versions");
    return response.json();
  }

  async fetchPaperBuilds(
    version: string
  ): Promise<{ build: number; time: string }[]> {
    const response = await this.request(
      `/api/paper/versions/${encodeURIComponent(version)}/builds`
    );
    return response.json();
  }

  async fetchInfo(encodedName = encodeURIComponent(this.name)) {
    const response = await this.request(`/api/servers/${encodedName}`);
    return response.json();
  }

  async fetchMessages(encodedName = encodeURIComponent(this.name)) {
    const response = await this.request(`/api/servers/${encodedName}/messages`);
    return response.json();
  }
}

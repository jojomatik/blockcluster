import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from "vitest";
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
import ServerConfig from "../../../server/components/server_config";

describe("ServerConfig", () => {
  it("applies defaults and keeps the configured Java path", () => {
    const config = new ServerConfig(undefined, undefined, undefined, "/java");

    expect(config.flags).toEqual([]);
    expect(config.autostart).toBe(false);
    expect(config.pauseOnIdle).toEqual({ enable: false, timeout: 300 });
    expect(config.javaPath).toBe("/java");
  });

  it("retains supplied settings", () => {
    const pauseOnIdle = { enable: true, timeout: 60 };
    const config = new ServerConfig(
      ["-Xmx2G"],
      true,
      pauseOnIdle,
      "/custom/java",
    );

    expect(config.flags).toEqual(["-Xmx2G"]);
    expect(config.autostart).toBe(true);
    expect(config.pauseOnIdle).toBe(pauseOnIdle);
    expect(config.javaPath).toBe("/custom/java");
  });
});

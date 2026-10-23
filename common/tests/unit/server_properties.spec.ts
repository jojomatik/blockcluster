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
import {
  getPropertiesFromFile,
  ServerPropertiesFile,
} from "../../../common/components/server_properties";

describe("server properties", () => {
  it("converts server.properties values to their application types", () => {
    const fileProperties: ServerPropertiesFile = {
      "level-seed": "world-seed",
      gamemode: "creative",
      "level-name": "world",
      motd: "A Minecraft server",
      pvp: "true",
      difficulty: "hard",
      "max-players": "12",
      "online-mode": "false",
      "view-distance": "10",
      "allow-nether": "true",
      "server-port": "25565",
      hardcore: "false",
      "white-list": "true",
      "spawn-protection": "16",
    };

    expect(getPropertiesFromFile(fileProperties)).toEqual({
      levelSeed: "world-seed",
      gamemode: "creative",
      levelName: "world",
      motd: "A Minecraft server",
      pvp: true,
      difficulty: "hard",
      maxPlayers: 12,
      onlineMode: false,
      viewDistance: 10,
      allowNether: true,
      serverPort: 25565,
      hardcore: false,
      whiteList: true,
      spawnProtection: 16,
    });
  });
});

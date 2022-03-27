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
 * A type that contains a selection of the properties of the `server.properties` file.
 */
export type ServerPropertiesFile = {
  "level-seed": string;
  gamemode: "survival" | "creative" | "spectator" | "adventure";
  "level-name": string;
  motd: string;
  pvp: string;
  difficulty: "peaceful" | "easy" | "medium" | "hard";
  "max-players": string;
  "online-mode": string;
  "view-distance": string;
  "allow-nether": string;
  "server-port": string;
  hardcore: string;
  "white-list": string;
  "spawn-protection": string;
};

/**
 * A type that contains some properties of a {@link Server}.
 */
export type ServerProperties = {
  levelSeed: string;
  gamemode: "survival" | "creative" | "spectator" | "adventure";
  levelName: string;
  motd: string;
  pvp: boolean;
  difficulty: "peaceful" | "easy" | "medium" | "hard";
  maxPlayers: number;
  onlineMode: boolean;
  viewDistance: number;
  allowNether: boolean;
  serverPort: number;
  hardcore: boolean;
  whiteList: boolean;
  spawnProtection: number;
};

/**
 * Returns the properties from the `server.properties` file converted to {@link ServerProperties}.
 *
 * @param read the properties from the file
 */
export function getPropertiesFromFile(
  read: ServerPropertiesFile
): ServerProperties {
  return {
    levelSeed: read["level-seed"],
    gamemode: read.gamemode,
    levelName: read["level-name"],
    motd: read.motd,
    pvp: read.pvp === "true",
    difficulty: read.difficulty,
    maxPlayers: Number.parseInt(read["max-players"]),
    onlineMode: read["online-mode"] === "true",
    viewDistance: Number.parseInt(read["view-distance"]),
    allowNether: read["allow-nether"] === "true",
    serverPort: Number.parseInt(read["server-port"]),
    hardcore: read.hardcore === "true",
    whiteList: read["white-list"] === "true",
    spawnProtection: Number.parseInt(read["spawn-protection"]),
  };
}

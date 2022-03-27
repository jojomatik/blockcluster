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

import ResourceUsage from "./resource_usage";
import Player from "./player";
import { ServerProperties } from "./server_properties";

/**
 * An enum that holds different states a {@link Server} can be in.
 */
export enum ServerStatus {
  Unknown,
  Stopped,
  Starting,
  Started,
  Stopping,
}

/**
 * A minecraft server.
 */
export default class Server {
  /**
   * An frozen instance of {@link Server} with default values.
   */
  static emptyServer: Readonly<Server> = Object.freeze(new Server({}));

  /**
   * Creates an instance of {@link Server} based on its name, its current state and its port.
   * @param data the data that shoudl be usd to create the {@link Server}:
   *    name: the name of the server.
   *    status: the status of the server.
   *    properties: the properties of the server:
   *      port: the port the server listens on.
   *      world: the main world of the server.
   *    favicon: the favicon of the server.
   *    jar: the jar file of the server.
   *    autostart: whether the server should start with the backend.
   *    javaPath: the path to the java runtime used to run the server.
   *    players: the players stats and a sample of players online.
   */
  constructor(data: ServerType) {
    this._name = data._name || "";
    this._status = data._status || ServerStatus.Unknown;
    this._properties = data._properties || {
      serverPort: 0,
      levelName: "",
      spawnProtection: 0,
      whiteList: false,
      hardcore: false,
      allowNether: false,
      viewDistance: 0,
      onlineMode: false,
      maxPlayers: 0,
      difficulty: "peaceful",
      motd: "",
      levelSeed: "",
      pvp: false,
      gamemode: "survival",
    };
    this._favicon = data._favicon || "";
    this._jar = data._jar || null;
    this._autostart = data._autostart || false;
    this._javaPath = data._javaPath || null;
    this._players = data._players || {
      online: 0,
      max: 0,
      sample: [],
    };
    this._resourceUsage = data._resourceUsage || [];
  }

  /**
   * The name of the {@link Server}.
   * @private
   */
  private _name: string;

  /**
   * Returns {@link #name}.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Sets a new value for {@link #name}.
   * @param value the new value.
   */
  set name(value: string) {
    this._name = value;
  }

  /**
   * The current {@link ServerStatus} of the {@link Server}.
   * @private
   */
  private _status: ServerStatus = ServerStatus.Unknown;

  /**
   * Returns {@link #status}.
   */
  get status(): ServerStatus {
    return this._status;
  }

  /**
   * Sets a new value for {@link #status}.
   * @param value the new value.
   */
  set status(value: ServerStatus) {
    this._status = value;
  }

  /**
   * The properties of this {@link Server}.
   * @private
   */
  private _properties: ServerProperties;

  /**
   * Returns {@link #_properties}.
   */
  get properties(): ServerProperties {
    return this._properties;
  }

  /**
   * Sets a new value for {@link #_properties}.
   * @private
   */
  set properties(value: ServerProperties) {
    this._properties = value;
  }

  /**
   * Returns the port of this {@link Server}.
   */
  get port(): number {
    return this.properties.serverPort;
  }

  /**
   * Sets a new port for this {@link Server}.
   * @private
   */
  set port(value: number) {
    this.properties.serverPort = value;
  }

  /**
   Returns the world of this {@link Server}.
   */
  get world(): string {
    return this.properties.levelName;
  }

  /**
   Sets a new world for this {@link Server}.
   * @param value the new value.
   */
  set world(value: string) {
    this.properties.levelName = value;
  }

  /**
   * The favicon of the {@link Server}.
   * @private
   */
  private _favicon: string;

  /**
   * Returns {@link #favicon}.
   */
  get favicon(): string {
    return this._favicon;
  }

  /**
   * Sets a new value for {@link #favicon}.
   * @param value the new value.
   */
  set favicon(value: string) {
    this._favicon = value;
  }

  /**
   * The jar file of the {@link Server}.
   * @private
   */
  private _jar: string | null;

  /**
   * Returns {@link #jar}.
   */
  get jar(): string | null {
    return this._jar;
  }

  /**
   * Sets a new value for {@link #jar}.
   * @param value the new value.
   */
  set jar(value: string | null) {
    this._jar = value;
  }

  /**
   * The java flags of this server.
   * @private
   */
  private _flags: string[] = [];

  /**
   * Returns {@link #flags}.
   */
  get flags(): string[] {
    return this._flags;
  }

  /**
   * Sets a new value for {@link #flags}.
   * @param value the new value.
   */
  set flags(value: string[]) {
    this._flags = value;
  }

  /**
   * Whether the server should start with the backend.
   * @private
   */
  private _autostart: boolean;

  /**
   * Returns {@link #autostart}.
   */
  get autostart(): boolean {
    return this._autostart;
  }

  /**
   * Sets a new value for {@link #autostart}.
   * @param value the new value.
   */
  set autostart(value: boolean) {
    this._autostart = value;
  }

  /**
   * The path to the java runtime.
   * @private
   */
  private _javaPath: string | null;

  /**
   * Returns {@link #_javaPath}.
   */
  get javaPath(): string | null {
    return this._javaPath;
  }

  /**
   * Sets a new value for {@link #_javaPath}.
   * @param value the new value.
   */
  set javaPath(value: string | null) {
    this._javaPath = value;
  }

  /**
   * A list of date time resource usage pairs.
   * @private
   */
  private _resourceUsage: ResourceUsage[] = [];

  /**
   * Returns {@link #resourceUsage}.
   */
  get resourceUsage(): ResourceUsage[] {
    return this._resourceUsage;
  }

  /**
   * Sets a new value for {@link #resourceUsage}.
   * @param value the new value.
   */
  set resourceUsage(value: ResourceUsage[]) {
    this._resourceUsage = value;
  }

  /**
   * The players stats and a sample of players online on the {@link Server}.
   * @private
   */
  private _players: playerStats;

  /**
   * Returns {@link #players}.
   */
  get players(): playerStats {
    return this._players;
  }

  /**
   * Sets a new value for {@link #players}.
   * @param value the new value.
   */
  set players(value: playerStats) {
    this._players = value;
  }

  /**
   * Returns a server stripped of all additional properties.
   */
  strip(): Server {
    const stripped: Record<string, unknown> = {};
    for (const key in this) {
      if (
        key in Server.emptyServer &&
        Object.prototype.hasOwnProperty.call(this, key)
      )
        stripped[key] = this[key];
    }
    return Object.assign(new Server({}), stripped);
  }

  /**
   * Stringifies the server to send it over the network.
   */
  stringify() {
    return JSON.stringify(this, (key, value) => {
      if (key === "" || key in Server.emptyServer) return value;
      return undefined;
    });
  }

  /**
   * Returns an array of servers stripped of all additional properties.
   */
  static strip(servers: Server[]): Server[] {
    const stripped: Server[] = [];
    servers.forEach((server) => {
      stripped.push(server.strip());
    });
    return stripped;
  }

  /**
   * Stringifies an array of servers to send it over the network.
   */
  static stringify(servers: Server[]) {
    let i = 0;
    return JSON.stringify(servers, (key, value) => {
      let num: number;
      if (
        key === "" ||
        key in Server.emptyServer ||
        !isNaN((num = Number(key))) ||
        num === i++
      ) {
        return value;
      }
      return undefined;
    });
  }
}

/**
 * A type that contains the player stats of a server.
 */
export type playerStats = {
  online: number;
  max: number;
  sample: Player[];
};

/**
 * A type that contains the properties of a {@link Server}.
 */
type ServerType = {
  /**
   * The name of this {@link ServerType}
   */
  _name?: string;

  /**
   * The status of this {@link ServerType}
   */
  _status?: ServerStatus;

  /**
   * The properties of this {@link ServerType}
   */
  _properties?: ServerProperties;

  /**
   * The favicon of this {@link ServerType}
   */
  _favicon?: string;

  /**
   * The jar of this {@link ServerType}
   */
  _jar?: string;

  /**
   * The autostart-property of this {@link ServerType}
   */
  _autostart?: boolean;

  /**
   * The java path of this {@link ServerType}
   */
  _javaPath?: string;

  /**
   * The player stats of this {@link ServerType}
   */
  _players?: playerStats;

  /**
   * The resource usage of this {@link ServerType}
   */
  _resourceUsage?: ResourceUsage[];
};

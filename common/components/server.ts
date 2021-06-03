import ResourceUsage from "./resource_usage";

/**
 * An enum that holds different states a {@link Server} can be in.
 */
export enum ServerStatus {
  Stopped,
  Starting,
  Started,
  Stopping,
  Unknown,
}

/**
 * A minecraft server.
 */
export default class Server {
  /**
   * An frozen instance of {@link Server} with default values.
   */
  static emptyServer: Readonly<Server> = Object.freeze(new Server());

  /**
   * Creates an instance of {@link Server} based on its name, its current state and its port.
   * @param name the name of the server.
   * @param status the status of the server.
   * @param port the port the server listens on.
   * @param world the main world of the server.
   * @param jar the jar file of the server.
   * @param autostart whether the server should start with the backend.
   */
  constructor(
    name = "",
    status: ServerStatus = ServerStatus.Unknown,
    port = 0,
    world = "",
    jar: string | null = null,
    autostart = false
  ) {
    this._name = name;
    this._status = status;
    this._port = port;
    this._world = world;
    this._jar = jar;
    this._autostart = autostart;
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
   * The port that the {@link Server} listens to.
   * @private
   */
  private _port: number;

  /**
   * Returns {@link #port}.
   */
  get port(): number {
    return this._port;
  }

  /**
   * Sets a new value for {@link #port}.
   * @private
   */
  set port(value: number) {
    this._port = value;
  }

  /**
   * The name of the world of the {@link Server}.
   * @private
   */
  private _world: string;

  /**
   * Returns {@link #world}.
   */
  get world(): string {
    return this._world;
  }

  /**
   * Sets a new value for {@link #world}.
   * @param value the new value.
   */
  set world(value: string) {
    this._world = value;
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
    return Object.assign(new Server(), stripped);
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

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
   */
  constructor(
    name = "",
    status: ServerStatus = ServerStatus.Unknown,
    port = 0
  ) {
    this._name = name;
    this._status = status;
    this._port = port;
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
   * Stringifies the server to send it over the network.
   */
  stringify() {
    return JSON.stringify(this, (key, value) => {
      if (key === "" || key in Server.emptyServer) return value;
      return undefined;
    });
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

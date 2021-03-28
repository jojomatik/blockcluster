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

/**
 * A class that represents the config file of a server.
 */
export default class ServerConfig {
  /**
   * The flags of the server.
   */
  public flags: string[];

  /**
   * Creates a new {@link ServerConfig}
   * @param flags the flags of the server, default = `[]`
   */
  constructor(flags: string[] = []) {
    this.flags = flags;
  }
}

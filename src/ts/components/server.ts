export enum ServerStatus {
  Offline,
  Online,
  Unknown
}

export default class Server {
  private name: string;
  private status: ServerStatus = ServerStatus.Unknown;

  constructor(name: string, status: ServerStatus) {
    this.name = name;
    this.status = status;
  }

  public getName(): string {
    return this.name;
  }

  public getStatus(): ServerStatus {
    return this.status;
  }
}

export enum ServerStatus {
  Offline,
  Online,
  Unknown
}

export default class Server {
  constructor(name: string, status: ServerStatus) {
    this._name = name;
    this._status = status;
  }

  private _name: string;

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  private _status: ServerStatus = ServerStatus.Unknown;

  get status(): ServerStatus {
    return this._status;
  }

  set status(value: ServerStatus) {
    this._status = value;
  }
}

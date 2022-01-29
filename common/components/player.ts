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
 * A minecraft player.
 */
export default class Player {
  /**
   * An frozen instance of {@link Player} with default values.
   */
  static emptyPlayer: Readonly<Player> = Object.freeze(new Player());

  /**
   * Creates an instance of {@link Player} based on its name, uuid and skin.
   * @param uuid the uuid of the player.
   * @param name the name of the player.
   * @param head the base64-encoded image of the head of the players skin.
   */
  constructor(uuid = "", name = "", head = "") {
    this._uuid = uuid;
    this._name = name;
    this._head = head;
  }

  /**
   * The uuid of the {@link Player}.
   * @private
   */
  private _uuid: string;

  /**
   * Returns {@link #uuid}.
   */
  get uuid(): string {
    return this._uuid;
  }

  /**
   * Sets a new value for {@link #uuid}.
   * @param value the new value.
   */
  set uuid(value: string) {
    this._uuid = value;
  }

  /**
   * The name of the {@link Player}.
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
   * The head of the {@link Player}.
   * @private
   */
  private _head: string;

  /**
   * Returns {@link #head}.
   */
  get head(): string {
    return this._head;
  }

  /**
   * Sets a new value for {@link #head}.
   * @param value the new value.
   */
  set head(value: string) {
    this._head = value;
  }

  /**
   * Returns a player stripped of all additional properties.
   */
  strip(): Player {
    const stripped: Record<string, unknown> = {};
    for (const key in this) {
      if (
        key in Player.emptyPlayer &&
        Object.prototype.hasOwnProperty.call(this, key)
      )
        stripped[key] = this[key];
    }
    return Object.assign(new Player(), stripped);
  }

  /**
   * Stringifies the player to send it over the network.
   */
  stringify() {
    return JSON.stringify(this, (key, value) => {
      if (key === "" || key in Player.emptyPlayer) return value;
      return undefined;
    });
  }

  /**
   * Returns an array of players stripped of all additional properties.
   */
  static strip(players: Player[]): Player[] {
    const stripped: Player[] = [];
    players.forEach((player) => {
      stripped.push(player.strip());
    });
    return stripped;
  }

  /**
   * Stringifies an array of players to send it over the network.
   */
  static stringify(players: Player[]) {
    let i = 0;
    return JSON.stringify(players, (key, value) => {
      let num: number;
      if (
        key === "" ||
        key in Player.emptyPlayer ||
        !isNaN((num = Number(key))) ||
        num === i++
      ) {
        return value;
      }
      return undefined;
    });
  }
}

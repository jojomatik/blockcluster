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
import Player from "../../../common/components/player";

describe("Player", () => {
  it("uses empty defaults and exposes its values through accessors", () => {
    const player = new Player();

    expect(player.uuid).toBe("");
    expect(player.name).toBe("");
    expect(player.head).toBe("");

    player.uuid = "player-id";
    player.name = "PlayerOne";
    player.head = "base64-head";

    expect(player.uuid).toBe("player-id");
    expect(player.name).toBe("PlayerOne");
    expect(player.head).toBe("base64-head");
  });

  it("strips extra fields from a player and from serialized output", () => {
    const player = Object.assign(new Player("player-id", "PlayerOne", "head"), {
      extra: "not sent",
    });
    const stripped = player.strip();

    expect(stripped).toBeInstanceOf(Player);
    expect(stripped.uuid).toBe("player-id");
    expect(stripped.name).toBe("PlayerOne");
    expect(stripped.head).toBe("head");
    expect(stripped).not.toHaveProperty("extra");
    expect(JSON.parse(player.stringify())).not.toHaveProperty("extra");
  });
});

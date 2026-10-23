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
import Message, { MessageType } from "../../../common/components/message";

describe("Message", () => {
  it("uses default values and generates a unique ID", () => {
    const first = new Message();
    const second = new Message();

    expect(first.type).toBe(MessageType.Default);
    expect(first.text).toBe("");
    expect(first.timestamp).toEqual(expect.any(Number));
    expect(first.uuid).toBeTruthy();
    expect(second.uuid).not.toBe(first.uuid);
  });

  it("stores supplied values and allows them to be updated", () => {
    const message = new Message(MessageType.Error, "Unable to start", 123);

    expect(message.type).toBe(MessageType.Error);
    expect(message.text).toBe("Unable to start");
    expect(message.timestamp).toBe(123);

    message.type = MessageType.Blockcluster;
    message.text = "Server started";
    message.timestamp = 456;

    expect(message.type).toBe(MessageType.Blockcluster);
    expect(message.text).toBe("Server started");
    expect(message.timestamp).toBe(456);
  });
});

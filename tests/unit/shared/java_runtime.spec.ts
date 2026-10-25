import { describe, expect, it } from "vitest";
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
import JavaRuntime, {
  getDefaultRuntime,
} from "#shared/components/java_runtime";

describe("JavaRuntime", () => {
  it("stores and updates its runtime details", () => {
    const runtime = new JavaRuntime("/java", "Java 21");

    expect(runtime.path).toBe("/java");
    expect(runtime.name).toBe("Java 21");
    expect(runtime.isDefault).toBe(false);

    runtime.path = "/custom/java";
    runtime.name = "Java 25";
    runtime.isDefault = true;

    expect(runtime.path).toBe("/custom/java");
    expect(runtime.name).toBe("Java 25");
    expect(runtime.isDefault).toBe(true);
  });

  it("returns the runtime marked as default", () => {
    const runtimes = [
      new JavaRuntime("/java-17", "Java 17"),
      new JavaRuntime("/java-21", "Java 21", true),
    ];

    expect(getDefaultRuntime(runtimes)).toBe(runtimes[1]);
  });

  it("throws when no runtime is marked as default", () => {
    expect(() => getDefaultRuntime([new JavaRuntime("/java-21")])).toThrow(
      "No default runtime found.",
    );
  });
});

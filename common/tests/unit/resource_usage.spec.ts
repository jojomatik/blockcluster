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
import ResourceUsage from "../../../common/components/resource_usage";

describe("ResourceUsage", () => {
  it("defaults CPU and memory usage to zero", () => {
    const usage = new ResourceUsage(123);

    expect(usage.time).toBe(123);
    expect(usage.cpu).toBe(0);
    expect(usage.memory).toBe(0);
  });

  it("stores supplied time, CPU, and memory values", () => {
    const usage = new ResourceUsage(456, 1.5, 1024);

    expect(usage).toEqual({ time: 456, cpu: 1.5, memory: 1024 });
  });
});

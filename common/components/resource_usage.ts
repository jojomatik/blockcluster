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
 * A class that represents one data point of resource usage.
 */
export default class ResourceUsage {
  /**
   * Creates are {@link ResourceUsage} object based on the time, cpu and memory usage.
   * @param time the time of measuring.
   * @param cpu the cpu usage relative to one core.
   * @param memory the memory usage in bytes.
   */
  constructor(time: number = Date.now(), cpu = 0, memory = 0) {
    this.time = time;
    this.cpu = cpu;
    this.memory = memory;
  }

  /**
   * The time of measuring this {@link ResourceUsage}.
   */
  readonly time: number;

  /**
   * The cpu usage relative to one core.
   *
   * If two cores are fully used `_cpu` will be 2.
   */
  readonly cpu: number;

  /**
   * The memory usage in bytes.
   */
  readonly memory: number;
}

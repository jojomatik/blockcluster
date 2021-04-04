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

import { shallowMount } from "@vue/test-utils";
import VersionDialogComponent from "../../../src/components/VersionDialogComponent.vue";

type Builds = { build: number; time: string }[];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mountDialog(fetchPaperBuilds = jest.fn()) {
  return shallowMount(VersionDialogComponent, {
    propsData: {
      server: { name: "survival", fetchPaperBuilds },
      updates: {
        build: { version: "1.21.8", build: 70 },
        patch: { version: "1.21.10", build: 5 },
      },
    },
    mocks: { $t: (key: string) => key },
  });
}

describe("VersionDialogComponent", () => {
  it("disables every install action while installing and preserves availability checks", async () => {
    const wrapper = mountDialog();
    await wrapper.setData({
      version: "1.21.8",
      build: 70,
      oldJars: ["old.jar"],
      oldJar: "old.jar",
    });
    const actions = () =>
      wrapper
        .findAllComponents({ name: "VBtn" })
        .wrappers.filter((button) => button.props("block"));
    expect(actions()).toHaveLength(4);
    expect(actions().map((button) => button.props("disabled"))).toEqual([
      false,
      false,
      false,
      false,
    ]);

    await wrapper.setData({ installing: true });
    expect(actions().every((button) => button.props("disabled"))).toBe(true);

    await wrapper.setData({ installing: false, version: null, oldJar: null });
    expect(actions().map((button) => button.props("disabled"))).toEqual([
      false,
      false,
      true,
      true,
    ]);
    await wrapper.setData({ version: "1.21.8", build: null });
    expect(actions()[2].props("disabled")).toBe(true);
    wrapper.destroy();
  });

  it.each(["success", "failure"])(
    "ignores an obsolete request's %s while the latest request is pending",
    async (outcome) => {
      const older = deferred<Builds>();
      const latest = deferred<Builds>();
      const fetchBuilds = jest
        .fn()
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(latest.promise);
      const wrapper = mountDialog(fetchBuilds);
      const loadBuilds = wrapper.vm.$options.methods?.loadBuilds;
      if (!loadBuilds) throw new Error("Missing loadBuilds method");
      await wrapper.setData({ version: "1.21.8" });
      const olderRequest = loadBuilds.call(wrapper.vm, "1.21.8");
      await wrapper.setData({ version: "1.21.10" });
      const latestRequest = loadBuilds.call(wrapper.vm, "1.21.10");

      if (outcome === "success") older.resolve([{ build: 70, time: "old" }]);
      else older.reject(new Error("obsolete failure"));
      await olderRequest;

      expect(wrapper.vm.$data).toMatchObject({
        builds: [],
        build: null,
        error: false,
        loadingBuilds: true,
      });
      const builds = [{ build: 5, time: "latest" }];
      latest.resolve(builds);
      await latestRequest;
      expect(wrapper.vm.$data).toMatchObject({
        builds,
        build: 5,
        error: false,
        loadingBuilds: false,
      });
      wrapper.destroy();
    }
  );

  it("keeps the latest request's error when an older request later succeeds", async () => {
    const older = deferred<Builds>();
    const fetchBuilds = jest
      .fn()
      .mockReturnValueOnce(older.promise)
      .mockRejectedValueOnce(new Error("latest failure"));
    const wrapper = mountDialog(fetchBuilds);
    const loadBuilds = wrapper.vm.$options.methods?.loadBuilds;
    if (!loadBuilds) throw new Error("Missing loadBuilds method");
    await wrapper.setData({ version: "1.21.8" });
    const olderRequest = loadBuilds.call(wrapper.vm, "1.21.8");
    await wrapper.setData({ version: "1.21.10" });
    await loadBuilds.call(wrapper.vm, "1.21.10");

    older.resolve([{ build: 70, time: "old" }]);
    await olderRequest;

    expect(wrapper.vm.$data).toMatchObject({
      builds: [],
      build: null,
      error: true,
      loadingBuilds: false,
    });
    wrapper.destroy();
  });
});

import { shallowMount } from "@vue/test-utils";
import VersionDialogComponent from "../../../src/components/VersionDialogComponent.vue";
import Server from "../../../src/lib/components/server";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mountDialog() {
  const server = new Server({ _name: "survival" });
  const wrapper = shallowMount(VersionDialogComponent, {
    propsData: {
      server,
      updates: {
        build: { version: "1.21.8", build: 70 },
        patch: { version: "1.21.10", build: 5 },
      },
    },
    mocks: { $t: (key: string) => key },
  });
  const load = (version: string) => {
    wrapper.vm.$data.version = version;
    const loadBuilds = wrapper.vm.$options.methods?.loadBuilds;
    if (!loadBuilds) throw new Error("Missing loadBuilds method");
    return loadBuilds.call(wrapper.vm, version) as Promise<void>;
  };
  return { server, wrapper, load };
}

describe("VersionDialogComponent", () => {
  it("disables all install actions while installing and preserves availability checks", async () => {
    const { wrapper } = mountDialog();
    await wrapper.setData({
      version: "1.21.8",
      build: 70,
      oldJars: ["custom.jar"],
      oldJar: "custom.jar",
    });
    const actions = () =>
      wrapper
        .findAll("v-btn-stub")
        .wrappers.filter((button) =>
          /version_dialog\.(install|update_build|update_patch)/.test(
            button.text()
          )
        );
    expect(actions()).toHaveLength(4);
    expect(actions().every((button) => !button.props("disabled"))).toBe(true);

    await wrapper.setData({ installing: true });
    expect(actions().every((button) => button.props("disabled"))).toBe(true);

    await wrapper.setData({ installing: false, build: null, oldJar: null });
    const installs = actions().filter((button) =>
      button.text().includes("version_dialog.install")
    );
    expect(installs.every((button) => button.props("disabled"))).toBe(true);
    await wrapper.setData({ build: 70, version: null });
    expect(installs[0].props("disabled")).toBe(true);
    wrapper.destroy();
  });

  it.each(["before", "after"])(
    "ignores a superseded success arriving %s the current response",
    async (order) => {
      const { server, wrapper, load } = mountDialog();
      const stale = deferred<{ build: number; time: string }[]>();
      const current = deferred<{ build: number; time: string }[]>();
      server.fetchPaperBuilds = jest
        .fn()
        .mockReturnValueOnce(stale.promise)
        .mockReturnValueOnce(current.promise);
      const staleRequest = load("1.21.8");
      const currentRequest = load("1.21.10");
      const builds = [{ build: 5, time: "2025-01-01" }];

      if (order === "after") {
        current.resolve(builds);
        await currentRequest;
      }
      stale.resolve([{ build: 70, time: "2025-01-01" }]);
      await staleRequest;
      expect(wrapper.vm.$data.builds).toEqual(order === "before" ? [] : builds);
      expect(wrapper.vm.$data.build).toBe(order === "before" ? null : 5);
      expect(wrapper.vm.$data.error).toBe(false);
      expect(wrapper.vm.$data.loadingBuilds).toBe(order === "before");

      if (order === "before") {
        current.resolve(builds);
        await currentRequest;
      }
      expect(wrapper.vm.$data.builds).toEqual(builds);
      expect(wrapper.vm.$data.build).toBe(5);
      expect(wrapper.vm.$data.loadingBuilds).toBe(false);
      wrapper.destroy();
    }
  );

  it.each(["before", "after"])(
    "ignores a superseded failure arriving %s the current response",
    async (order) => {
      const { server, wrapper, load } = mountDialog();
      const stale = deferred<{ build: number; time: string }[]>();
      const current = deferred<{ build: number; time: string }[]>();
      server.fetchPaperBuilds = jest
        .fn()
        .mockReturnValueOnce(stale.promise)
        .mockReturnValueOnce(current.promise);
      const staleRequest = load("1.21.8");
      const currentRequest = load("1.21.10");
      const builds = [{ build: 5, time: "2025-01-01" }];
      if (order === "after") {
        current.resolve(builds);
        await currentRequest;
      }
      stale.reject(new Error("offline"));
      await staleRequest;
      expect(wrapper.vm.$data.error).toBe(false);
      expect(wrapper.vm.$data.loadingBuilds).toBe(order === "before");
      if (order === "before") {
        current.resolve(builds);
        await currentRequest;
      }
      expect(wrapper.vm.$data.builds).toEqual(builds);
      expect(wrapper.vm.$data.build).toBe(5);
      wrapper.destroy();
    }
  );

  it("reports a failure for the selected version and clears loading", async () => {
    const { server, wrapper, load } = mountDialog();
    server.fetchPaperBuilds = jest.fn().mockRejectedValue(new Error("offline"));
    await load("1.21.8");
    expect(wrapper.vm.$data.error).toBe(true);
    expect(wrapper.vm.$data.loadingBuilds).toBe(false);
    wrapper.destroy();
  });
});

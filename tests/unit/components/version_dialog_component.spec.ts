import { shallowMount } from "@vue/test-utils";
import VersionDialogComponent from "../../../src/components/VersionDialogComponent.vue";

type Build = { build: number; time: string };

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
  const wrapper = shallowMount(VersionDialogComponent, {
    propsData: {
      server: { name: "test", fetchPaperBuilds },
      updates: {
        build: { version: "1.21.8", build: 70 },
        patch: { version: "1.21.10", build: 5 },
      },
    },
    mocks: { $t: (key: string) => key },
  });
  const vm = wrapper.vm as unknown as {
    version: string;
    builds: Build[];
    build: number | null;
    error: boolean;
    loadingBuilds: boolean;
    loadBuilds: (version: string) => Promise<void>;
  };
  return { wrapper, vm };
}

describe("VersionDialogComponent", () => {
  it("disables every install action and selector during installation", async () => {
    const { wrapper } = mountDialog();
    await wrapper.setData({
      version: "1.21.8",
      build: 70,
      oldJars: ["old.jar"],
      oldJar: "old.jar",
    });
    const buttons = () =>
      wrapper
        .findAllComponents({ name: "VBtn" })
        .wrappers.filter(
          (button) => button.props("outlined") && button.props("block")
        );
    const selectors = () =>
      wrapper.findAllComponents({ name: "VSelect" }).wrappers;
    expect(buttons()).toHaveLength(4);
    expect(buttons().every((button) => !button.props("disabled"))).toBe(true);

    await wrapper.setData({ installing: true });
    expect(buttons().every((button) => button.props("disabled"))).toBe(true);
    expect(selectors().every((select) => select.props("disabled"))).toBe(true);

    await wrapper.setData({
      installing: false,
      version: null,
      build: null,
      oldJar: null,
    });
    expect(buttons().map((button) => button.props("disabled"))).toEqual([
      false,
      false,
      true,
      true,
    ]);
    expect(selectors()[1].props("disabled")).toBe(true);
    wrapper.destroy();
  });

  it.each(["success", "failure"])(
    "ignores superseded request %s while the current request is pending",
    async (outcome) => {
      const old = deferred<Build[]>();
      const current = deferred<Build[]>();
      const fetch = jest
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(current.promise);
      const { wrapper, vm } = mountDialog(fetch);
      vm.version = "1.21.8";
      const first = vm.loadBuilds(vm.version);
      vm.version = "1.21.10";
      const second = vm.loadBuilds(vm.version);

      if (outcome === "success")
        old.resolve([{ build: 70, time: "2025-01-01" }]);
      else old.reject(new Error("offline"));
      await first;
      expect(vm.builds).toEqual([]);
      expect(vm.build).toBeNull();
      expect(vm.error).toBe(false);
      expect(vm.loadingBuilds).toBe(true);

      const builds = [{ build: 5, time: "2025-01-02" }];
      current.resolve(builds);
      await second;
      expect(vm.builds).toEqual(builds);
      expect(vm.build).toBe(5);
      expect(vm.loadingBuilds).toBe(false);
      wrapper.destroy();
    }
  );

  it("keeps the current selection when a superseded response arrives last", async () => {
    const old = deferred<Build[]>();
    const builds = [{ build: 5, time: "2025-01-02" }];
    const fetch = jest
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(builds);
    const { wrapper, vm } = mountDialog(fetch);
    vm.version = "1.21.8";
    const first = vm.loadBuilds(vm.version);
    vm.version = "1.21.10";
    await vm.loadBuilds(vm.version);
    old.resolve([{ build: 70, time: "2025-01-01" }]);
    await first;
    expect(vm.builds).toEqual(builds);
    expect(vm.build).toBe(5);
    expect(vm.error).toBe(false);
    expect(vm.loadingBuilds).toBe(false);
    wrapper.destroy();
  });

  it("shows a failure of the current request and clears its loading state", async () => {
    const { wrapper, vm } = mountDialog(
      jest.fn().mockRejectedValue(new Error("offline"))
    );
    vm.version = "1.21.8";
    await vm.loadBuilds(vm.version);
    expect(vm.error).toBe(true);
    expect(vm.loadingBuilds).toBe(false);
    wrapper.destroy();
  });
});

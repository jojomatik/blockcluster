import { vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import VersionDialogComponent from "@/components/VersionDialogComponent.vue";

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
function mountDialog(
  fetchPaperBuilds = vi
    .fn()
    .mockResolvedValue([{ build: 70, time: "2025-01-01" }]),
) {
  const server = {
    name: "test",
    fetchPaperVersions: vi.fn().mockResolvedValue(["1.21.8", "1.21.10"]),
    fetchOldJars: vi.fn().mockResolvedValue(["old.jar"]),
    fetchPaperBuilds,
    installUpdate: vi.fn().mockResolvedValue(undefined),
    installVersion: vi.fn().mockResolvedValue(undefined),
    installExistingJar: vi.fn().mockResolvedValue(undefined),
  };
  const wrapper = shallowMount(VersionDialogComponent, {
    props: {
      server: server as never,
      updates: {
        build: { version: "1.21.8", build: 70 },
        patch: { version: "1.21.10", build: 5 },
      },
    },
  });
  return { wrapper, server };
}
async function openDialog(wrapper: ReturnType<typeof shallowMount>) {
  await wrapper.findAllComponents({ name: "VBtn" })[0].trigger("click");
  await flushPromises();
}

describe("VersionDialogComponent", () => {
  it("disables install actions and selectors while installation is pending", async () => {
    const install = deferred<undefined>();
    const { wrapper, server } = mountDialog();
    server.installVersion.mockReturnValue(install.promise);
    await openDialog(wrapper);
    const selectors = wrapper.findAllComponents({ name: "VSelect" });
    await selectors[0].vm.$emit("update:modelValue", "1.21.8");
    await flushPromises();
    await selectors[1].vm.$emit("update:modelValue", 70);
    const buttons = wrapper.findAllComponents({ name: "VBtn" });
    const installButton = buttons.find(
      (button) =>
        button.text().includes("gui.views.server.version_dialog.install") &&
        !button.props("disabled"),
    );
    if (!installButton)
      throw new Error(
        "Version install button was not enabled after selecting a build.",
      );
    await installButton.trigger("click");
    const installButtons = buttons.filter((button) =>
      button.text().includes("gui.views.server.version_dialog.install"),
    );
    expect(installButtons.every((button) => button.props("disabled"))).toBe(
      true,
    );
    expect(selectors.every((select) => select.props("disabled"))).toBe(true);
    install.resolve(undefined);
    await flushPromises();
    wrapper.unmount();
  });

  it.each(["success", "failure"])(
    "ignores a superseded request that later %s",
    async (outcome) => {
      const older = deferred<Build[]>();
      const current = deferred<Build[]>();
      const fetchBuilds = vi
        .fn()
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(current.promise);
      const { wrapper } = mountDialog(fetchBuilds);
      await openDialog(wrapper);
      const selects = wrapper.findAllComponents({ name: "VSelect" });
      const oldRequest = selects[0].vm.$emit("update:modelValue", "1.21.8");
      await selects[0].vm.$emit("update:modelValue", "1.21.10");
      if (outcome === "success")
        older.resolve([{ build: 70, time: "2025-01-01" }]);
      else older.reject(new Error("offline"));
      await flushPromises();
      expect(selects[1].props("items")).toEqual([]);
      const builds = [{ build: 5, time: "2025-01-02" }];
      current.resolve(builds);
      await flushPromises();
      expect(selects[1].props("items")).toEqual(builds);
      expect(selects[1].props("modelValue")).toBe(5);
      void oldRequest;
      wrapper.unmount();
    },
  );

  it("keeps the latest request error when an older response arrives afterward", async () => {
    const older = deferred<Build[]>();
    const fetchBuilds = vi
      .fn()
      .mockReturnValueOnce(older.promise)
      .mockRejectedValueOnce(new Error("latest failure"));
    const { wrapper } = mountDialog(fetchBuilds);
    await openDialog(wrapper);
    const selects = wrapper.findAllComponents({ name: "VSelect" });
    await selects[0].vm.$emit("update:modelValue", "1.21.8");
    await selects[0].vm.$emit("update:modelValue", "1.21.10");
    await flushPromises();
    older.resolve([{ build: 70, time: "2025-01-01" }]);
    await flushPromises();
    expect(selects[1].props("items")).toEqual([]);
    expect(wrapper.text()).toContain("gui.views.server.version_dialog.error");
    wrapper.unmount();
  });
});

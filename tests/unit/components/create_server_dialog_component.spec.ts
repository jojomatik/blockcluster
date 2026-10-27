import { vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import CreateServerDialogComponent from "@/components/CreateServerDialogComponent.vue";

const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn() }));
mockNuxtImport("$fetch", () => fetchData);

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

async function fillForm(
  wrapper: ReturnType<typeof shallowMount>,
  name: string,
  port?: string,
) {
  const fields = wrapper.findAllComponents({ name: "VTextField" });
  await fields[0]!.vm.$emit("update:modelValue", name);
  if (port !== undefined) await fields[1]!.vm.$emit("update:modelValue", port);
  await wrapper
    .findAllComponents({ name: "VSelect" })[0]!
    .vm.$emit("update:modelValue", "1.21.8");
  await wrapper.vm.$nextTick();
}

async function submit(wrapper: ReturnType<typeof shallowMount>) {
  await wrapper.findAllComponents({ name: "VBtn" }).at(-1)!.trigger("click");
}

describe("CreateServerDialogComponent", () => {
  it.each([
    ["", false],
    ["   ", false],
    ["name#1", false],
    ["a".repeat(65), false],
    [".", false],
    ["..", false],
    ["../outside", false],
    ["café", false],
    ["name\nnext", false],
    ["a".repeat(64), true],
    ["My Server_1.2-3", true],
  ])("validates the submitted name %j", async (name, valid) => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetch as unknown as typeof global.fetch;
    const wrapper = shallowMount(CreateServerDialogComponent);
    await fillForm(wrapper, name);
    expect(
      wrapper.findAllComponents({ name: "VBtn" }).at(-1)!.props("disabled"),
    ).toBe(!valid);
    expect(wrapper.findComponent({ name: "VTextField" }).props("hint")).toBe(
      "gui.views.home.create_server.name_hint",
    );
    expect(
      wrapper.findComponent({ name: "VTextField" }).props("persistentHint"),
    ).toBeDefined();
    await submit(wrapper);
    expect(fetch).toHaveBeenCalledTimes(valid ? 1 : 0);
    wrapper.unmount();
  });

  it("loads Paper versions and submits the directory name and selected version", async () => {
    fetchData.mockResolvedValue(["1.21.8", "1.21.7"]);
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetch as unknown as typeof global.fetch;
    const wrapper = shallowMount(CreateServerDialogComponent);
    await wrapper.findAllComponents({ name: "VBtn" })[0]!.trigger("click");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(
      wrapper.findAllComponents({ name: "VSelect" })[0]!.props("items"),
    ).toEqual(["1.21.8", "1.21.7"]);
    await fillForm(wrapper, "  My Paper Server  ");
    await submit(wrapper);
    expect(fetchData).toHaveBeenCalledWith("/api/paper/versions");
    expect(fetch).toHaveBeenCalledWith("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Paper Server", version: "1.21.8" }),
    });
    expect(wrapper.emitted("created")).toHaveLength(1);
    wrapper.unmount();
  });

  it.each([
    ["", true],
    ["25570", true],
    ["1023", false],
    ["65536", false],
    ["abc", false],
    ["25.5", false],
  ])("validates the requested port %j", async (port, valid) => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetch as unknown as typeof global.fetch;
    const wrapper = shallowMount(CreateServerDialogComponent);
    await fillForm(wrapper, "Server", port);
    expect(
      wrapper.findAllComponents({ name: "VBtn" }).at(-1)!.props("disabled"),
    ).toBe(!valid);
    await submit(wrapper);
    if (valid) {
      const body = JSON.parse(
        (fetch.mock.calls[0]![1] as RequestInit).body as string,
      );
      expect(body).toEqual(
        port === ""
          ? { name: "Server", version: "1.21.8" }
          : { name: "Server", version: "1.21.8", port: Number(port) },
      );
    } else expect(fetch).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

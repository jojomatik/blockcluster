import { vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import ResourceUsage from "#shared/components/resource_usage";
import { ServerStatus } from "#shared/components/server";
import WorldDeleteDialogComponent from "@/components/WorldDeleteDialogComponent.vue";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import ServerComponent from "@/components/ServerComponent.vue";
import Server from "@/lib/components/server";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

function prepareServer(server: Server) {
  server.fetchInfo = vi.fn().mockResolvedValue({});
  server.fetchUpdates = vi.fn().mockResolvedValue(null);
}

describe("server interaction components", () => {
  it("cancels the EULA prompt without accepting or starting the server", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    }) as unknown as typeof fetch;
    const server = new Server({ _name: "survival" });
    prepareServer(server);
    server.acceptEula = vi.fn();
    server.sendAction = vi.fn();
    const wrapper = shallowMount(ServerComponent, {
      props: { server, detailed: true },
    });
    await flushPromises();
    wrapper
      .findComponent({ name: "ConsoleComponent" })
      .vm.$emit("eula-required");
    await wrapper.vm.$nextTick();
    const cancel = wrapper
      .findAllComponents({ name: "VBtn" })
      .find((button) => button.text() === "gui.views.server.eula.cancel");
    if (!cancel) throw new Error("EULA cancel button was not rendered.");
    await cancel.trigger("click");
    expect(server.acceptEula).not.toHaveBeenCalled();
    expect(server.sendAction).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("blocks world deletion during a transition and closes after a successful delete", async () => {
    const sendAction = vi.fn().mockResolvedValue(undefined);
    const server = new Server({ _name: "my world" });
    server.sendAction = sendAction;
    const wrapper = shallowMount(WorldDeleteDialogComponent, {
      props: { server, status: ServerStatus.Starting, buttonClass: "ml-auto" },
    });
    const buttons = wrapper.findAllComponents({ name: "VBtn" });
    expect(buttons[0]!.props("disabled")).toBe(true);
    await wrapper.setProps({ status: ServerStatus.Stopped });
    expect(buttons[0]!.props("disabled")).toBe(false);
    await buttons[0]!.trigger("click");
    const input = wrapper.findComponent({ name: "VTextField" });
    await input.vm.$emit("update:modelValue", "my world");
    wrapper
      .findComponent({ name: "VForm" })
      .vm.$emit("update:modelValue", true);
    await wrapper.vm.$nextTick();
    const confirm = wrapper
      .findAllComponents({ name: "VBtn" })
      .find((button) =>
        button.text().includes("gui.views.server.delete_world.dialog.confirm"),
      );
    if (!confirm)
      throw new Error("World delete confirmation was not rendered.");
    await confirm.trigger("click");
    expect(sendAction).toHaveBeenCalledWith("deleteWorld");
    wrapper.unmount();
  });

  it("builds CPU and memory chart series from resource measurements", () => {
    const usage = [
      new ResourceUsage(1000, 50, 1024 * 1024),
      new ResourceUsage(2000, 25, 2 * 1024 * 1024),
    ];
    const wrapper = shallowMount(ResourceChartComponent, {
      props: { resourceUsage: usage },
      global: {
        stubs: {
          apexchart: {
            name: "ApexChart",
            props: ["series", "options"],
            template: "<div />",
          },
        },
      },
    });
    expect(
      wrapper.findComponent({ name: "ApexChart" }).props("series"),
    ).toEqual([
      { name: "gui.views.server.resource_usage.cpu", data: [0.5, 0.25] },
      { name: "gui.views.server.resource_usage.memory", data: [1, 2] },
    ]);
    wrapper.unmount();
  });

  it("persists server configuration edits through the detailed controls", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    }) as unknown as typeof fetch;
    const server = new Server({ _name: "survival", _autostart: false });
    prepareServer(server);
    const updateConfig = vi.fn().mockResolvedValue(undefined);
    server.updateConfig = updateConfig;
    const wrapper = shallowMount(ServerComponent, {
      props: { server, detailed: true },
    });
    await flushPromises();
    const switches = wrapper.findAllComponents({ name: "VSwitch" });
    await switches[0]!.vm.$emit("update:modelValue", true);
    await switches[1]!.vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(updateConfig).toHaveBeenNthCalledWith(1, { autostart: true });
    expect(updateConfig).toHaveBeenNthCalledWith(2, {
      pauseOnIdle: { enable: true, timeout: 300 },
    });
    expect(server.autostart).toBe(true);
    expect(server.pauseOnIdle.enable).toBe(true);
    wrapper.unmount();
  });

  it("rolls configuration back when the update request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([]),
    }) as unknown as typeof fetch;
    const server = new Server({ _name: "survival", _autostart: false });
    prepareServer(server);
    server.updateConfig = vi.fn().mockRejectedValue(new Error("offline"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = shallowMount(ServerComponent, {
      props: { server, detailed: true },
    });
    await flushPromises();
    await wrapper
      .findAllComponents({ name: "VSwitch" })[0]!
      .vm.$emit("update:modelValue", true);
    await flushPromises();
    expect(server.autostart).toBe(false);
    expect(error).toHaveBeenCalledWith(
      "Could not update server configuration:",
      expect.any(Error),
    );
    wrapper.unmount();
  });
});

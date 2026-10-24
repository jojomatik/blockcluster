import { shallowMount } from "@vue/test-utils";
import { CreateElement, VNode } from "vue";
import Vuetify from "vuetify";
import ResourceUsage from "../../../common/components/resource_usage";
import { ServerStatus } from "../../../common/components/server";
import WorldDeleteDialogComponent from "../../../src/components/WorldDeleteDialogComponent.vue";
import ResourceChartComponent from "../../../src/components/ResourceChartComponent.vue";
import ServerComponent from "../../../src/components/ServerComponent.vue";
import Server from "../../../src/lib/components/server";

describe("server interaction components", () => {
  it("cancels the EULA dialog without accepting or starting the server", async () => {
    const server = new Server({ _name: "survival" });
    server.acceptEula = jest.fn();
    server.sendAction = jest.fn();
    const wrapper = shallowMount(ServerComponent, {
      propsData: { server, detailed: false },
      mocks: {
        $route: { params: {} },
        $socket: { client: { on: jest.fn(), off: jest.fn() } },
        $t: (key: string) => key,
      },
    });
    await wrapper.setProps({ detailed: true });
    await wrapper.setData({
      eulaDialog: true,
      eulaAccepted: true,
      eulaError: "A previous attempt failed",
    });
    const cancel = wrapper
      .findAll("v-btn-stub")
      .wrappers.find(
        (button) => button.text() === "gui.views.server.eula.cancel"
      );
    if (!cancel) throw new Error("EULA cancel button was not rendered.");

    cancel.vm.$emit("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.$data.eulaDialog).toBe(false);
    expect(wrapper.vm.$data.eulaAccepted).toBe(false);
    expect(wrapper.vm.$data.eulaError).toBe("");
    expect(server.acceptEula).not.toHaveBeenCalled();
    expect(server.sendAction).not.toHaveBeenCalled();
    wrapper.destroy();
  });

  it("blocks world deletion during a transition and closes after a successful delete", async () => {
    const sendAction = jest.fn().mockResolvedValue(undefined);
    const server = new Server({ _name: "my world" });
    server.sendAction = sendAction;
    const wrapper = shallowMount(WorldDeleteDialogComponent, {
      propsData: {
        server,
        status: ServerStatus.Starting,
        buttonClass: "ml-auto",
      },
      mocks: { $t: (key: string) => key },
    });

    const isDisabled = wrapper.vm.$options.methods?.isDisabled;
    if (typeof isDisabled !== "function") {
      throw new Error(
        "WorldDeleteDialogComponent is missing its isDisabled method."
      );
    }
    expect(isDisabled.call(wrapper.vm)).toBe(true);
    await wrapper.setProps({ status: ServerStatus.Stopped });
    expect(isDisabled.call(wrapper.vm)).toBe(false);
    wrapper.vm.$data.dialog = true;
    wrapper.vm.$data.currentTextInput = "my world";
    wrapper.vm.$data.isFormValid = true;
    const deleteWorld = wrapper.vm.$options.methods?.deleteWorld;
    if (typeof deleteWorld !== "function") {
      throw new Error(
        "WorldDeleteDialogComponent is missing its deleteWorld method."
      );
    }
    await deleteWorld.call(wrapper.vm);

    expect(sendAction).toHaveBeenCalledWith("deleteWorld");
    expect(wrapper.vm.$data.dialog).toBe(false);
    expect(wrapper.vm.$data.currentTextInput).toBe("");
    wrapper.destroy();
  });

  it("builds CPU and memory chart series from resource measurements", () => {
    const usage = [
      new ResourceUsage(1000, 50, 1024 * 1024),
      new ResourceUsage(2000, 25, 2 * 1024 * 1024),
    ];
    const wrapper = shallowMount(ResourceChartComponent, {
      propsData: { resourceUsage: usage },
      mocks: { $t: (key: string) => key },
      vuetify: new Vuetify({
        theme: {
          themes: {
            light: {
              text: "#111",
              primary: "#fff",
              accent: "#f00",
              secondary: "#00f",
            },
          },
        },
      }),
      stubs: {
        VueApexChart: {
          name: "VueApexChart",
          props: ["series", "options"],
          render(createElement: CreateElement): VNode {
            return createElement("div");
          },
        },
      },
    });
    const series = wrapper
      .findComponent({ name: "VueApexChart" })
      .props("series");

    expect(series).toEqual([
      {
        name: "gui.views.server.resource_usage.cpu",
        data: [0.5, 0.25],
      },
      {
        name: "gui.views.server.resource_usage.memory",
        data: [1, 2],
      },
    ]);
    wrapper.destroy();
  });

  it("uses the route name before server data arrives and persists config edits", async () => {
    const server = new Server({});
    const updateConfig = jest.fn().mockResolvedValue(undefined);
    server.updateConfig = updateConfig;
    const socketEvents = new Map<string, (...args: unknown[]) => void>();
    const wrapper = shallowMount(ServerComponent, {
      propsData: { server, detailed: false },
      mocks: {
        $route: { params: { server: "new world" } },
        $socket: {
          client: {
            on: jest.fn(
              (event: string, callback: (...args: unknown[]) => void) =>
                socketEvents.set(event, callback)
            ),
            off: jest.fn(),
          },
        },
        $t: (key: string) => key,
      },
    });

    const component = wrapper.vm as typeof wrapper.vm & {
      getName: () => string;
      autostart: boolean;
      setPauseEnabled: (value: boolean | null) => void;
    };
    expect(component.getName()).toBe("new world");
    component.autostart = true;
    component.setPauseEnabled(true);
    await wrapper.vm.$nextTick();

    expect(updateConfig).toHaveBeenNthCalledWith(1, { autostart: true });
    expect(updateConfig).toHaveBeenNthCalledWith(2, {
      // Enabling pause-on-idle uses the component's default timeout.
      pauseOnIdle: { enable: true, timeout: 300 },
    });
    expect(server.autostart).toBe(true);
    expect(server.pauseOnIdle.enable).toBe(true);
    wrapper.destroy();
  });

  it("rolls configuration back when the update request fails", async () => {
    const server = new Server({ _name: "survival", _autostart: false });
    server.updateConfig = jest.fn().mockRejectedValue(new Error("offline"));
    const error = jest.spyOn(console, "error").mockImplementation();
    const wrapper = shallowMount(ServerComponent, {
      propsData: { server, detailed: false },
      mocks: {
        $route: { params: { server: "survival" } },
        $socket: { client: { on: jest.fn(), off: jest.fn() } },
        $t: (key: string) => key,
      },
    });

    const component = wrapper.vm as typeof wrapper.vm & {
      autostart: boolean;
    };
    component.autostart = true;
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(server.autostart).toBe(false);
    expect(error).toHaveBeenCalledWith(
      "Could not update server configuration:",
      expect.any(Error)
    );
    wrapper.destroy();
  });
});

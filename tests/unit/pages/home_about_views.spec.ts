import { vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h, Suspense } from "vue";
import ResourceUsage from "#shared/components/resource_usage";
import AboutView from "@/pages/about.vue";
import HomeView from "@/pages/index.vue";

const { socket, fetchData } = vi.hoisted(() => ({
  socket: { on: vi.fn(), off: vi.fn() },
  fetchData: vi.fn(),
}));
mockNuxtImport("useSocket", () => () => socket);
mockNuxtImport("useRequestFetch", () => () => fetchData);

afterEach(() => {
  socket.on.mockReset();
  socket.off.mockReset();
  fetchData.mockReset();
});

function usage(time: number, cpu: number, memory: number) {
  return { time, cpu, memory };
}

function mountHome(fetch: (url: string) => Promise<unknown>) {
  fetchData.mockImplementation(fetch);
  return mount(
    defineComponent({
      setup: () => () =>
        h(Suspense, null, {
          default: () => h(HomeView),
        }),
    }),
    {
      global: {
        stubs: {
          ResourceChartComponent: {
            name: "ResourceChartComponent",
            props: ["resourceUsage"],
            template: "<div />",
          },
        },
      },
    },
  );
}

describe("HomeView", () => {
  it("sums synchronized server usage and retains the last total until all servers synchronize", async () => {
    let serverRequest = 0;
    const fetch = async (url: string) => {
      if (url === "/api/servers") {
        serverRequest++;
        const servers =
          serverRequest === 1
            ? [
                { _name: "one", _resourceUsage: [usage(1000, 20, 200)] },
                { _name: "two", _resourceUsage: [usage(1000, 30, 300)] },
              ]
            : [
                { _name: "one", _resourceUsage: [usage(2000, 20, 200)] },
                { _name: "two", _resourceUsage: [usage(1000, 30, 300)] },
              ];
        return servers;
      }
      return [usage(1000, 10, 100)];
    };
    const wrapper = mountHome(fetch);
    await flushPromises();
    const chart = wrapper.findComponent({ name: "ResourceChartComponent" });
    expect(chart.props("resourceUsage")).toEqual([
      new ResourceUsage(1000, 60, 600),
    ]);
    await wrapper.findAllComponents({ name: "VBtn" }).at(-1)!.trigger("click");
    await flushPromises();
    expect(chart.props("resourceUsage")).toEqual([
      new ResourceUsage(1000, 60, 600),
    ]);
    wrapper.unmount();
  });

  it("uses system samples when no servers are available and clears them on an empty update", async () => {
    let onSystemUsage: ((data: Record<string, unknown>[]) => void) | undefined;
    socket.on.mockImplementation((event, callback) => {
      if (event === "SYSTEM_USAGE") onSystemUsage = callback;
    });
    const fetch = async (url: string) =>
      url === "/api/servers" ? [] : [usage(1000, 5, 50)];
    const wrapper = mountHome(fetch);
    await flushPromises();
    const chart = wrapper.findComponent({ name: "ResourceChartComponent" });
    expect(chart.props("resourceUsage")).toEqual([
      new ResourceUsage(1000, 5, 50),
    ]);
    if (!onSystemUsage)
      throw new Error("The system usage listener was not registered.");
    onSystemUsage([]);
    await wrapper.vm.$nextTick();
    expect(chart.props("resourceUsage")).toEqual([]);
    wrapper.unmount();
    expect(socket.off).toHaveBeenCalledWith("SYSTEM_USAGE");
  });
});

describe("AboutView", () => {
  it("loads project, backend, and parsed frontend notices", async () => {
    fetchData.mockImplementation((url: string) => {
      if (url === "/api/dependencies")
        return Promise.resolve({ dependencies: [{ name: "backend-lib" }] });
      return Promise.resolve([
        {
          name: "library",
          version: "1.2.3",
          author: { name: "Example Author" },
          repository: "https://github.com/example/library",
          license: "MIT",
          licenseText: "MIT license\nAll rights reserved",
        },
      ]);
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(Suspense, null, {
            default: () => h(AboutView),
          }),
      }),
      { global: { stubs: ["NoticeComponent"] } },
    );
    await flushPromises();
    const notices = wrapper
      .findAllComponents({ name: "NoticeComponent" })
      .map((component) => component.props("notice"));
    expect(fetchData).toHaveBeenCalledWith("/api/dependencies");
    expect(fetchData).toHaveBeenCalledWith("/dependencies.json");
    expect(notices).toHaveLength(3);
    expect(notices.map((notice) => notice.name)).toEqual([
      "blockcluster",
      "backend-lib",
      "library",
    ]);
    expect(notices[0].version).toBe("develop");
    expect(notices[0].notice).toContain("GNU Affero General Public License");
    expect(notices[2]).toMatchObject({
      name: "library",
      version: "1.2.3",
      author: "Example Author",
      repositoryLink: "https://github.com/example/library",
      notice: "MIT license\nAll rights reserved",
    });
    wrapper.unmount();
  });
});

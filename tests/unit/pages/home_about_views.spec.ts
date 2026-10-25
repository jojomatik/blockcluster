import { vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import ResourceUsage from "#shared/components/resource_usage";
import AboutView from "@/pages/about.vue";
import HomeView from "@/pages/index.vue";

const { socket } = vi.hoisted(() => ({
  socket: { on: vi.fn(), off: vi.fn() },
}));
mockNuxtImport("useSocket", () => () => socket);

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  socket.on.mockReset();
  socket.off.mockReset();
});

function usage(time: number, cpu: number, memory: number) {
  return { time, cpu, memory };
}

function mountHome(fetch: typeof global.fetch) {
  global.fetch = fetch;
  return shallowMount(HomeView, {
    global: {
      stubs: {
        ResourceChartComponent: {
          name: "ResourceChartComponent",
          props: ["resourceUsage"],
          template: "<div />",
        },
      },
    },
  });
}

describe("HomeView", () => {
  it("sums synchronized server usage and retains the last total until all servers synchronize", async () => {
    let serverRequest = 0;
    const fetch = vi.fn((url: string) => {
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
        return Promise.resolve({ json: () => Promise.resolve(servers) });
      }
      return Promise.resolve({
        json: () => Promise.resolve([usage(1000, 10, 100)]),
      });
    }) as unknown as typeof global.fetch;
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
    const fetch = vi.fn((url: string) =>
      Promise.resolve({
        json: () =>
          Promise.resolve(url === "/api/servers" ? [] : [usage(1000, 5, 50)]),
      }),
    ) as unknown as typeof global.fetch;
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
    const fetch = vi.fn((url: string) => {
      if (url === "/api/dependencies")
        return Promise.resolve({
          json: () =>
            Promise.resolve({ dependencies: [{ name: "backend-lib" }] }),
        });
      return Promise.resolve({
        json: () =>
          Promise.resolve([
            {
              name: "library",
              version: "1.2.3",
              author: { name: "Example Author" },
              repository: "https://github.com/example/library",
              license: "MIT",
              licenseText: "MIT license\nAll rights reserved",
            },
          ]),
      });
    }) as unknown as typeof global.fetch;
    global.fetch = fetch;
    const wrapper = shallowMount(AboutView, {
      global: { stubs: ["NoticeComponent"] },
    });
    await flushPromises();
    const notices = wrapper
      .findAllComponents({ name: "NoticeComponent" })
      .map((component) => component.props("notice"));
    expect(fetch).toHaveBeenCalledWith("/api/dependencies");
    expect(fetch).toHaveBeenCalledWith("/dependencies.json");
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

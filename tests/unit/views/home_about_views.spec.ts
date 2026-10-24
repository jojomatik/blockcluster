import { shallowMount } from "@vue/test-utils";
import ResourceUsage from "../../../common/components/resource_usage";
import CommonServer from "../../../common/components/server";
import AboutView from "../../../src/views/AboutView.vue";
import HomeView from "../../../src/views/HomeView.vue";
import Notice from "../../../common/components/software_notice";

function mountHomeView() {
  global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue([]),
  });
  return shallowMount(HomeView, {
    mocks: {
      $socket: { client: { on: jest.fn(), off: jest.fn() } },
      $t: (key: string) => key,
    },
    stubs: ["ResourceChartComponent", "Server"],
  });
}

describe("HomeView", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sums synchronized server usage with system usage and reuses the last complete sample", async () => {
    const wrapper = mountHomeView();
    await wrapper.vm.$nextTick();

    const system = [new ResourceUsage(1000, 10, 100)];
    const first = new CommonServer({
      _name: "one",
      _resourceUsage: [new ResourceUsage(1000, 20, 200)],
    });
    const second = new CommonServer({
      _name: "two",
      _resourceUsage: [new ResourceUsage(1000, 30, 300)],
    });
    wrapper.vm.$data.systemUsage = system;
    wrapper.vm.$data.servers = [first, second];

    const home = wrapper.vm as typeof wrapper.vm & {
      getTotalUsage: () => ResourceUsage[];
    };
    const total = home.getTotalUsage();
    expect(total).toHaveLength(1);
    expect(total[0]).toMatchObject({ time: 1000, cpu: 60, memory: 600 });

    second.resourceUsage = [new ResourceUsage(2000, 30, 300)];
    // Keep the prior total until the system and every server share a sample.
    expect(home.getTotalUsage()).toBe(total);
    wrapper.destroy();
  });

  it("uses system samples when there are no servers and returns cached data when the system is empty", async () => {
    const wrapper = mountHomeView();
    await wrapper.vm.$nextTick();
    const system = [new ResourceUsage(1000, 5, 50)];
    wrapper.vm.$data.systemUsage = system;
    const home = wrapper.vm as typeof wrapper.vm & {
      getTotalUsage: () => ResourceUsage[];
    };
    expect(home.getTotalUsage()).toBe(system);
    wrapper.vm.$data.systemUsage = [];
    expect(home.getTotalUsage()).toEqual([]);
    wrapper.destroy();
  });
});

describe("AboutView", () => {
  const originalFetch = global.fetch;
  const originalGitSha = process.env.VUE_APP_GIT_SHA;
  const separator = "-".repeat(80) + "\n";

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalGitSha === undefined) delete process.env.VUE_APP_GIT_SHA;
    else process.env.VUE_APP_GIT_SHA = originalGitSha;
  });

  it("loads project, backend, and parsed frontend notices", async () => {
    process.env.VUE_APP_GIT_SHA = "abcdef012345";
    const frontendNotices =
      separator +
      "library v1.2.3 - Example Author\nhttps://github.com/example/library\n" +
      separator +
      "\nMIT license\nAll rights reserved\n";
    global.fetch = jest.fn((url: string) => {
      if (url === "LICENSE") {
        return Promise.resolve({
          text: () => Promise.resolve("Project license"),
        });
      }
      if (url === "api/dependencies") {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ dependencies: [{ name: "backend-lib" }] }),
        });
      }
      return Promise.resolve({ text: () => Promise.resolve(frontendNotices) });
    }) as unknown as typeof fetch;

    const wrapper = shallowMount(AboutView, {
      mocks: { $t: (key: string) => key },
      stubs: ["NoticeComponent"],
    });

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const about = wrapper.vm as typeof wrapper.vm & {
      loading: boolean;
      projectNotice: Notice;
      backendNotices: Notice[];
      frontendNotices: Notice[];
    };
    expect(about.loading).toBe(false);
    expect(about.projectNotice).toMatchObject({
      name: "blockcluster",
      version: "abcdef0",
      notice: "Project license",
    });
    expect(about.backendNotices).toEqual([{ name: "backend-lib" }]);
    expect(about.frontendNotices).toHaveLength(1);
    expect(about.frontendNotices[0]).toMatchObject({
      name: "library",
      version: "v1.2.3",
      author: "Example Author",
      repositoryLink: "https://github.com/example/library",
      notice: "MIT license\nAll rights reserved",
    });
    expect(about.frontendNotices[0]).toBeInstanceOf(Notice);
    wrapper.destroy();
  });
});

import { shallowMount } from "@vue/test-utils";
import CreateServerDialogComponent from "../../../src/components/CreateServerDialogComponent.vue";

describe("CreateServerDialogComponent", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("loads Paper versions and submits the directory name and selected version", async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(["1.21.8", "1.21.7"]),
      })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetch as unknown as typeof global.fetch;
    const wrapper = shallowMount(CreateServerDialogComponent, {
      mocks: { $t: (key: string) => key },
    });
    const component = wrapper.vm as typeof wrapper.vm & {
      open: () => Promise<void>;
      create: () => Promise<void>;
      name: string;
      version: string | null;
      versions: string[];
    };

    await component.open();
    expect(component.versions).toEqual(["1.21.8", "1.21.7"]);

    component.name = "  My Paper Server  ";
    component.version = "1.21.8";
    await component.create();

    expect(fetch).toHaveBeenNthCalledWith(2, "/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Paper Server", version: "1.21.8" }),
    });
    expect(wrapper.emitted("created")).toHaveLength(1);
    wrapper.destroy();
  });
});

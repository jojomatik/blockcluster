import { shallowMount } from "@vue/test-utils";
import VersionDialogComponent from "../../../src/components/VersionDialogComponent.vue";
import Server from "../../../src/lib/components/server";

describe("VersionDialogComponent", () => {
  it("ignores build results from a superseded version request", async () => {
    const pending = new Map<
      string,
      {
        resolve: (builds: { build: number; time: string }[]) => void;
        reject: (error: Error) => void;
      }
    >();
    const server = new Server({ _name: "survival" });
    server.fetchPaperBuilds = jest.fn(
      (version: string) =>
        new Promise((resolve, reject) => {
          pending.set(version, { resolve, reject });
        })
    );
    const wrapper = shallowMount(VersionDialogComponent, {
      propsData: { server },
      mocks: { $t: (key: string) => key },
    });
    const component = wrapper.vm as unknown as {
      version: string | null;
      builds: { build: number; time: string }[];
      build: number | null;
      loadingBuilds: boolean;
      error: boolean;
      loadBuilds: (version: string) => Promise<void>;
    };

    component.version = "1.21.8";
    const oldRequest = component.loadBuilds("1.21.8");
    component.version = "1.21.10";
    const currentRequest = component.loadBuilds("1.21.10");

    const oldRequestHandlers = pending.get("1.21.8");
    if (!oldRequestHandlers) throw new Error("Missing old build request.");
    oldRequestHandlers.reject(new Error("stale request"));
    await oldRequest;
    expect(component.loadingBuilds).toBe(true);
    expect(component.error).toBe(false);
    expect(component.builds).toEqual([]);
    expect(component.build).toBeNull();

    const currentRequestHandlers = pending.get("1.21.10");
    if (!currentRequestHandlers)
      throw new Error("Missing current build request.");
    currentRequestHandlers.resolve([{ build: 10, time: "2025-01-01" }]);
    await currentRequest;
    expect(component.loadingBuilds).toBe(false);
    expect(component.builds).toEqual([{ build: 10, time: "2025-01-01" }]);
    expect(component.build).toBe(10);
    wrapper.destroy();
  });
});

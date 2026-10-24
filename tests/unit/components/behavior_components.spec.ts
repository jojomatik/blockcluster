import { shallowMount } from "@vue/test-utils";
import Notice from "../../../common/components/software_notice";
import { ServerStatus } from "../../../common/components/server";
import PlayerStatsComponent from "../../../src/components/PlayerStatsComponent.vue";
import ServerStatusComponent from "../../../src/components/ServerStatusComponent.vue";
import GitHubVersionLink from "../../../src/components/GitHubVersionLink.vue";
import NoticeComponent from "../../../src/components/NoticeComponent.vue";
import FlagDialogComponent from "../../../src/components/FlagDialogComponent.vue";
import Server from "../../../src/lib/components/server";

describe("presentation components", () => {
  it("renders release and commit links to their corresponding GitHub pages", () => {
    const release = shallowMount(GitHubVersionLink, {
      propsData: {
        version: "v1.2.3",
        gitRoot: "https://github.com/example/project",
      },
    });
    const commit = shallowMount(GitHubVersionLink, {
      propsData: {
        version: "abcdef0",
        gitRoot: "https://github.com/example/project",
      },
    });

    expect(release.find("a").attributes("href")).toBe(
      "https://github.com/example/project/releases/tag/v1.2.3"
    );
    expect(commit.find("a").attributes("href")).toBe(
      "https://github.com/example/project/tree/abcdef0"
    );

    release.destroy();
    commit.destroy();
  });

  it("shows localized server statuses and keeps the status-specific color", async () => {
    const wrapper = shallowMount(ServerStatusComponent, {
      propsData: { status: ServerStatus.Started },
      mocks: { $t: (key: string) => key },
    });

    expect(wrapper.text()).toContain("gui.views.server.status.started");
    expect(wrapper.findComponent({ name: "VChip" }).props("color")).toBe(
      "green"
    );
    await wrapper.setProps({ status: ServerStatus.Paused });
    expect(wrapper.findComponent({ name: "VChip" }).props("color")).toBe(
      "secondary"
    );
    wrapper.destroy();
  });

  it("renders player counts, accessible heads, and the requested face size", () => {
    const wrapper = shallowMount(PlayerStatsComponent, {
      propsData: {
        playerStats: {
          online: 1,
          max: 20,
          sample: [{ uuid: "uuid-1", name: "Alex", head: "aGVhZA==" }],
        },
        width: 24,
      },
      mocks: {
        $t: (key: string, values: Record<string, string>) =>
          `${key}:${values.name}`,
      },
    });

    expect(wrapper.text().replace(/\s+/g, " ")).toContain("1 / 20");
    expect(wrapper.text()).toContain("Alex");
    expect(wrapper.html()).toContain("width: 24px");
    wrapper.destroy();
  });

  it("renders linked and plain notices with collapsed multi-line license text", () => {
    const linkedNotice = new Notice(
      "library",
      "1.0.0",
      "author",
      "https://github.com/example/library",
      "Copyright\nAll rights reserved"
    );
    const linked = shallowMount(NoticeComponent, {
      propsData: { notice: linkedNotice },
      mocks: { $t: (key: string) => key },
    });
    const plain = shallowMount(NoticeComponent, {
      propsData: {
        notice: new Notice("plain", "2.0.0", "", "", "MIT"),
      },
      mocks: { $t: (key: string) => key },
    });

    expect(linked.find("a").attributes("href")).toBe(
      linkedNotice.repositoryLink
    );
    expect(linked.findComponent({ name: "VExpansionPanels" }).exists()).toBe(
      true
    );
    expect(plain.find("a").exists()).toBe(false);
    expect(plain.find("code.licenseText").text()).toBe("MIT");

    linked.destroy();
    plain.destroy();
  });

  it("tracks edited JVM flags and submits the changed values to the server", async () => {
    const updateConfig = jest.fn().mockResolvedValue(undefined);
    const wrapper = shallowMount(FlagDialogComponent, {
      propsData: {
        server: { updateConfig } as unknown as Server,
        flags: ["-Xms1G"],
      },
      mocks: { $t: (key: string) => key },
    });

    const component = wrapper.vm as typeof wrapper.vm & {
      flagString: string;
      input: (content: string) => void;
    };
    expect(component.flagString).toBe("-Xms1G");
    component.input("-Xms2G -Xmx4G");
    expect(component.flagString).toBe("-Xms2G -Xmx4G");
    const sendFlags = wrapper.vm.$options.methods?.sendFlags;
    if (typeof sendFlags !== "function") {
      throw new Error("FlagDialogComponent is missing its sendFlags method.");
    }
    await sendFlags.call(wrapper.vm);

    expect(updateConfig).toHaveBeenCalledWith({
      flags: ["-Xms2G", "-Xmx4G"],
    });
    expect(wrapper.vm.$data.flagsChanged).toBe(false);
    wrapper.destroy();
  });
});

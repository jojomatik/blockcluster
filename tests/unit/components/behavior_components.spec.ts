import { vi } from "vitest";
import { shallowMount } from "@vue/test-utils";
import Player from "#shared/components/player";
import Notice from "#shared/components/software_notice";
import { ServerStatus } from "#shared/components/server";
import PlayerStatsComponent from "@/components/PlayerStatsComponent.vue";
import ServerStatusComponent from "@/components/ServerStatusComponent.vue";
import GitHubVersionLink from "@/components/GitHubVersionLink.vue";
import NoticeComponent from "@/components/NoticeComponent.vue";
import FlagDialogComponent from "@/components/FlagDialogComponent.vue";
import type Server from "@/lib/components/server";

describe("presentation components", () => {
  it("renders release and commit links to their corresponding GitHub pages", () => {
    const release = shallowMount(GitHubVersionLink, {
      props: {
        version: "v1.2.3",
        gitRoot: "https://github.com/example/project",
      },
    });
    const commit = shallowMount(GitHubVersionLink, {
      props: {
        version: "abcdef0",
        gitRoot: "https://github.com/example/project",
      },
    });

    expect(release.find("a").attributes("href")).toBe(
      "https://github.com/example/project/releases/tag/v1.2.3",
    );
    expect(commit.find("a").attributes("href")).toBe(
      "https://github.com/example/project/tree/abcdef0",
    );

    release.unmount();
    commit.unmount();
  });

  it("shows localized server statuses and keeps the status-specific color", async () => {
    const wrapper = shallowMount(ServerStatusComponent, {
      props: { status: ServerStatus.Started },
    });

    expect(wrapper.text()).toContain("gui.views.server.status.started");
    expect(wrapper.findComponent({ name: "VChip" }).props("color")).toBe(
      "green",
    );
    await wrapper.setProps({ status: ServerStatus.Paused });
    expect(wrapper.findComponent({ name: "VChip" }).props("color")).toBe(
      "secondary",
    );
    wrapper.unmount();
  });

  it("renders player counts, accessible heads, and the requested face size", () => {
    const wrapper = shallowMount(PlayerStatsComponent, {
      props: {
        playerStats: {
          online: 1,
          max: 20,
          sample: [new Player("uuid-1", "Alex", "aGVhZA==")],
        },
        width: 24,
      },
    });

    expect(wrapper.text().replace(/\s+/g, " ")).toContain("1 / 20");
    expect(wrapper.find("img").attributes("alt")).toContain("Alex");
    expect(wrapper.html()).toContain("width: 24px");
    wrapper.unmount();
  });

  it("renders linked and plain notices with collapsed multi-line license text", () => {
    const linkedNotice = new Notice(
      "library",
      "1.0.0",
      "author",
      "https://github.com/example/library",
      "Copyright\nAll rights reserved",
    );
    const linked = shallowMount(NoticeComponent, {
      props: { notice: linkedNotice },
    });
    const plain = shallowMount(NoticeComponent, {
      props: {
        notice: new Notice("plain", "2.0.0", "", "", "MIT"),
      },
    });

    expect(linked.find("a").attributes("href")).toBe(
      linkedNotice.repositoryLink,
    );
    expect(linked.findComponent({ name: "VExpansionPanels" }).exists()).toBe(
      true,
    );
    expect(plain.find("a").exists()).toBe(false);
    expect(plain.find("code.licenseText").text()).toBe("MIT");

    linked.unmount();
    plain.unmount();
  });

  it("tracks edited JVM flags and submits the changed values to the server", async () => {
    const updateConfig = vi.fn().mockResolvedValue(undefined);
    const wrapper = shallowMount(FlagDialogComponent, {
      props: {
        server: { updateConfig } as unknown as Server,
        flags: ["-Xms1G"],
      },
    });

    const input = wrapper.findComponent({ name: "VTextField" });
    await input.trigger("focus");
    await input.vm.$emit("update:modelValue", "-Xms2G -Xmx4G");
    expect(wrapper.findComponent({ name: "VBtn" }).props("disabled")).toBe(
      false,
    );
    await wrapper.findComponent({ name: "VBtn" }).trigger("click");

    expect(updateConfig).toHaveBeenCalledWith({
      flags: ["-Xms2G", "-Xmx4G"],
    });
    wrapper.unmount();
  });
});

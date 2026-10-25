import { vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { MessageType } from "#shared/components/message";
import { ServerStatus } from "#shared/components/server";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import Server from "@/lib/components/server";

const { socketMock } = vi.hoisted(() => ({
  socketMock: { on: vi.fn(), off: vi.fn() },
}));
mockNuxtImport("useSocket", () => () => socketMock);

type MessageData = {
  _uuid: string;
  _timestamp: number;
  _type: MessageType;
  _text: string;
};

function createMessage(
  uuid: string,
  timestamp: number,
  text: string,
  type = MessageType.Default,
): MessageData {
  return { _uuid: uuid, _timestamp: timestamp, _text: text, _type: type };
}

describe("ConsoleComponent", () => {
  it("buffers live messages while history loads, marks date changes, and deduplicates", async () => {
    let resolveHistory!: (messages: MessageData[]) => void;
    const history = new Promise<MessageData[]>((resolve) => {
      resolveHistory = resolve;
    });
    const server = new Server({ _name: "a server" });
    server.fetchMessages = vi.fn().mockReturnValue(history);
    let onMessage: ((data: Record<string, unknown>) => void) | undefined;
    socketMock.on.mockImplementation((_event, callback) => {
      onMessage = callback;
    });
    const wrapper = shallowMount(ConsoleComponent, {
      props: { server, status: ServerStatus.Started },
    });
    const firstDay = Date.UTC(2025, 0, 1, 23, 59);
    const nextDay = Date.UTC(2025, 0, 2, 0, 1);
    if (!onMessage) {
      throw new Error("ConsoleComponent did not register its message handler.");
    }
    // Deliver a live event before history resolves to exercise buffering.
    onMessage({
      message: createMessage("live-event", nextDay, "live event"),
    });
    resolveHistory([
      createMessage("history", firstDay, "history"),
      // Duplicate history UUIDs are dropped before buffered messages append.
      createMessage("history", nextDay, "duplicate"),
    ]);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const messages = wrapper.text();
    expect(messages).toContain("2025-01-01");
    expect(messages).toContain("history");
    expect(messages).toContain("2025-01-02");
    expect(messages).toContain("live event");
    expect(server.fetchMessages).toHaveBeenCalledWith("a%20server");
    wrapper.unmount();
    expect(socketMock.off).toHaveBeenCalledWith("server_a%20server");
  });

  it("reports history and command errors to the console message list", async () => {
    const server = new Server({ _name: "broken" });
    server.fetchMessages = vi.fn().mockRejectedValue("offline");
    server.sendCommand = vi.fn().mockRejectedValue(new Error("unavailable"));
    const wrapper = shallowMount(ConsoleComponent, {
      props: { server, status: ServerStatus.Started },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    await wrapper
      .findComponent({ name: "VTextField" })
      .vm.$emit("update:modelValue", "say hello");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Could not load server messages: offline");
    expect(wrapper.text()).toContain("Could not send command: unavailable");
    wrapper.unmount();
  });

  describe("EULA prompt", () => {
    const eulaText =
      "You need to agree to the EULA in order to run the server. Go to eula.txt for more info.";

    async function mountWithHistory(history: MessageData[]) {
      const server = new Server({ _name: "eula" });
      server.fetchMessages = vi.fn().mockResolvedValue(history);
      let onMessage: ((data: Record<string, unknown>) => void) | undefined;
      socketMock.on.mockImplementation((_event, callback) => {
        onMessage = callback;
      });
      const wrapper = shallowMount(ConsoleComponent, {
        props: { server, status: ServerStatus.Stopped },
      });
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();
      if (!onMessage) throw new Error("Message handler was not registered.");
      return { wrapper, onMessage };
    }

    it("requests the dialog when the EULA message is the latest message", async () => {
      const { wrapper } = await mountWithHistory([
        createMessage("1", 1000, "starting"),
        createMessage("2", 2000, eulaText),
      ]);

      expect(wrapper.emitted("eula-required")).toHaveLength(1);
      wrapper.unmount();
    });

    it("does not request the dialog for a EULA message that was followed by other messages", async () => {
      const { wrapper } = await mountWithHistory([
        createMessage("1", 1000, eulaText),
        createMessage("2", 2000, "starting again"),
        createMessage("3", 3000, 'Done (3.2s)! For help, type "help"'),
      ]);

      expect(wrapper.emitted("eula-required")).toBeUndefined();
      wrapper.unmount();
    });

    it("requests the dialog for a live EULA message and not once later messages arrive", async () => {
      const { wrapper, onMessage } = await mountWithHistory([
        createMessage("1", 1000, "starting"),
      ]);

      onMessage({ message: createMessage("2", 2000, eulaText) });
      expect(wrapper.emitted("eula-required")).toHaveLength(1);

      onMessage({ message: createMessage("3", 3000, "starting again") });
      expect(wrapper.emitted("eula-required")).toHaveLength(1);
      wrapper.unmount();
    });
  });
});

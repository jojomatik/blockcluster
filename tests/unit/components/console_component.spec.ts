import { shallowMount } from "@vue/test-utils";
import Message, { MessageType } from "../../../common/components/message";
import { ServerStatus } from "../../../common/components/server";
import ConsoleComponent from "../../../src/components/ConsoleComponent.vue";
import Server from "../../../src/lib/components/server";

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
  type = MessageType.Default
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
    server.fetchMessages = jest.fn().mockReturnValue(history);
    let onMessage: ((data: Record<string, unknown>) => void) | undefined;
    const socket = {
      on: jest.fn(
        (_event: string, callback: (data: Record<string, unknown>) => void) => {
          onMessage = callback;
        }
      ),
      off: jest.fn(),
    };
    const wrapper = shallowMount(ConsoleComponent, {
      propsData: { server, status: ServerStatus.Started },
      mocks: {
        $route: { params: { server: "route name" } },
        $socket: { client: socket },
        $t: (key: string) => key,
      },
    });
    const firstDay = Date.UTC(2025, 0, 1, 23, 59);
    const nextDay = Date.UTC(2025, 0, 2, 0, 1);

    wrapper.vm.$refs.console = {
      offsetTop: 100,
      offsetHeight: 20,
    } as unknown as HTMLElement;
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

    const messages = wrapper.vm.$data.messages as Message[];
    expect(messages.map(({ text, type }) => [text, type])).toEqual([
      ["2025-01-01", MessageType.DateChange],
      ["history", MessageType.Default],
      ["2025-01-02", MessageType.DateChange],
      ["live event", MessageType.Default],
    ]);
    expect(server.fetchMessages).toHaveBeenCalledWith("a%20server");
    wrapper.destroy();
    expect(socket.off).toHaveBeenCalledWith("server_a%20server");
  });

  it("reports history and command errors to the console message list", async () => {
    const server = new Server({ _name: "broken" });
    server.fetchMessages = jest.fn().mockRejectedValue("offline");
    server.sendCommand = jest.fn().mockRejectedValue(new Error("unavailable"));
    const consoleElement = document.createElement("div");
    Object.defineProperty(consoleElement, "offsetTop", { value: 0 });
    Object.defineProperty(consoleElement, "offsetHeight", { value: 100 });
    const consoleEnd = document.createElement("span");
    Object.defineProperty(consoleEnd, "offsetTop", { value: 0 });
    const wrapper = shallowMount(ConsoleComponent, {
      propsData: { server, status: ServerStatus.Started },
      mocks: {
        $route: { params: {} },
        $socket: { client: { on: jest.fn(), off: jest.fn() } },
        $t: (key: string) => key,
      },
    });
    wrapper.vm.$refs.console = consoleElement;
    wrapper.vm.$refs.consoleEnd = consoleEnd;
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const sendCommand = wrapper.vm.$options.methods?.sendCommand;
    if (typeof sendCommand !== "function") {
      throw new Error("ConsoleComponent is missing its sendCommand method.");
    }
    await sendCommand.call(wrapper.vm);

    const messages = wrapper.vm.$data.messages as Message[];
    expect(messages.map(({ type, text }) => [type, text])).toEqual([
      [MessageType.Error, "Could not load server messages: offline"],
      [MessageType.Error, "Could not send command: unavailable"],
    ]);
    wrapper.destroy();
  });

  describe("EULA prompt", () => {
    const eulaText =
      "You need to agree to the EULA in order to run the server. Go to eula.txt for more info.";

    async function mountWithHistory(history: MessageData[]) {
      const server = new Server({ _name: "eula" });
      server.fetchMessages = jest.fn().mockResolvedValue(history);
      let onMessage: ((data: Record<string, unknown>) => void) | undefined;
      const wrapper = shallowMount(ConsoleComponent, {
        propsData: { server, status: ServerStatus.Stopped },
        mocks: {
          $route: { params: {} },
          $socket: {
            client: {
              on: (_event: string, callback: typeof onMessage) => {
                onMessage = callback;
              },
              off: jest.fn(),
            },
          },
          $t: (key: string) => key,
        },
      });
      // Keep the scrolling logic inert, as jsdom does not implement it.
      const consoleElement = document.createElement("div");
      Object.defineProperty(consoleElement, "offsetTop", { value: 0 });
      Object.defineProperty(consoleElement, "offsetHeight", { value: 100 });
      const consoleEnd = document.createElement("span");
      Object.defineProperty(consoleEnd, "offsetTop", { value: 0 });
      wrapper.vm.$refs.console = consoleElement;
      wrapper.vm.$refs.consoleEnd = consoleEnd;
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
      wrapper.destroy();
    });

    it("does not request the dialog for a EULA message that was followed by other messages", async () => {
      const { wrapper } = await mountWithHistory([
        createMessage("1", 1000, eulaText),
        createMessage("2", 2000, "starting again"),
        createMessage("3", 3000, 'Done (3.2s)! For help, type "help"'),
      ]);

      expect(wrapper.emitted("eula-required")).toBeUndefined();
      wrapper.destroy();
    });

    it("requests the dialog for a live EULA message and not once later messages arrive", async () => {
      const { wrapper, onMessage } = await mountWithHistory([
        createMessage("1", 1000, "starting"),
      ]);

      onMessage({ message: createMessage("2", 2000, eulaText) });
      expect(wrapper.emitted("eula-required")).toHaveLength(1);

      onMessage({ message: createMessage("3", 3000, "starting again") });
      expect(wrapper.emitted("eula-required")).toHaveLength(1);
      wrapper.destroy();
    });
  });
});

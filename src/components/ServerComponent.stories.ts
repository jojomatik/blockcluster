import Vue from "vue";
import VueRouter from "vue-router";
import { expect } from "@storybook/jest";
import { userEvent, waitFor, within } from "@storybook/testing-library";
import ServerComponent from "@/components/ServerComponent.vue";
import Server from "@/lib/components/server";
import { ServerStatus } from "../../common/components/server";
import { MessageType } from "../../common/components/message";
import ResourceUsage from "../../common/components/resource_usage";
import prepareEnum from "../../.storybook/enumPrepare";

Vue.use(VueRouter);

// The components subscribe to socket.io events; stub the client for stories.
(Vue.prototype as Record<string, unknown>).$socket = {
  client: { on: () => undefined, off: () => undefined },
};

const JAVA_PATH = "/usr/lib/jvm/java-17/bin/java";
const javaRuntimes = [
  { _path: JAVA_PATH, _name: "OpenJDK 17", _isDefault: true },
  { _path: "/usr/lib/jvm/java-21/bin/java", _name: "OpenJDK 21" },
];

const jojomatikHead =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsSAAALEgHS3X78AAAA+ElEQVQYlR3JzUvCYACA8fefCyKs7OKgD7oF1bFTEAQimhGVRXRZxJY1FGOQs3RQZAeLIjqkESgbUSB9rMQ1Nip4wh2ey/MTbX2ShiLxehjDUgZoaWPYuQnu5QjPWhRhZ6NYmkRTHaF1MMqDKmFnh3jKj2Opg4iXfAzHzPBWTOEYSdzTDfyzdb4ryzSVYcTvxRZBEBCfy8FjEeoF5qf3IHD5NDOIn+om3rXGX8MIMexmF7e6jVNeRXTMNd7PZa5mI3C3D3Wd25l+gkqKzvES4uMowVcpjV+TuZzqC/NrO+HrmWgXFnD0RbpGHO8kiVdO0zVXcEoJevYPlgLGCbqeWAwAAAAASUVORK5CYII=";

const itspolderHead =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsSAAALEgHS3X78AAAAmUlEQVQYlWPI9TD6n+qs/x9El/ia/U+w0/kfa6sN5oNohmIfU7Bgor3ufxAbRsPYDCBJGOfDvjlgDGLDMEOYpcb/7xc2/P96Yx+Y/nx4EZztbaj8n+Hjvjn/v768/T/UQv3/j5v7/38+uADMBomB5FAU/Hx48v+7Lf2oCt5u6AEzPh+cDzYWhkFiIDmGZzOLwAyQADIGiYHkAMEjq+CVYnJuAAAAAElFTkSuQmCC";

/** A {@link Server} whose network calls are simulated in memory. */
class MockServer extends Server {
  async sendAction(action: string) {
    const set = (status: ServerStatus) => (this.status = status);
    if (action === "start") {
      set(ServerStatus.Starting);
      setTimeout(() => set(ServerStatus.Started), 300);
    } else if (action === "stop") {
      set(ServerStatus.Stopping);
      setTimeout(() => set(ServerStatus.Stopped), 300);
    } else if (action === "restart") {
      set(ServerStatus.Starting);
      setTimeout(() => set(ServerStatus.Started), 300);
    } else if (action === "pause") {
      set(ServerStatus.Paused);
    }
    return new Response();
  }

  async updateConfig() {
    return new Response();
  }

  async fetchInfo() {
    return {};
  }

  async fetchMessages() {
    const now = Date.now();
    return [
      {
        _timestamp: now - 5000,
        _uuid: "m1",
        _type: MessageType.Default,
        _text: '[Server thread/INFO]: Done (3.2s)! For help, type "help"',
      },
    ];
  }

  async sendCommand() {
    return new Response();
  }
}

function makeServer(status: ServerStatus, name = "Survival World") {
  const now = Date.now();
  return new MockServer({
    _name: name,
    _status: status,
    _jar: "paper-1.20.4.jar",
    _javaPath: JAVA_PATH,
    _autostart: true,
    _pauseOnIdle: { enable: true, timeout: 300 },
    _players: {
      online: 2,
      max: 20,
      sample: [
        {
          uuid: "852da943-b45c-45aa-8cbd-22d8e9b38473",
          name: "Jojomatik",
          head: jojomatikHead,
        },
        {
          uuid: "e2a74186-be9d-42e5-a254-c40150404557",
          name: "ItsPolder",
          head: itspolderHead,
        },
      ],
    },
    _resourceUsage: Array.from(
      { length: 20 },
      (_, i) =>
        new ResourceUsage(
          now - (20 - i) * 5000,
          0.2 + 0.1 * Math.sin(i),
          800_000_000 + i * 5_000_000
        )
    ),
  } as ConstructorParameters<typeof Server>[0]);
}

const mockFetch = () => {
  window.fetch = (async (url: RequestInfo | URL) =>
    new Response(
      JSON.stringify(String(url).includes("java-runtimes") ? javaRuntimes : {})
    )) as typeof window.fetch;
};

export default {
  title: "Components/ServerComponent",
  component: ServerComponent,
  argTypes: {
    detailed: { control: "boolean" },
  },
  decorators: [
    () => {
      mockFetch();
      return {
        router: new VueRouter({ mode: "abstract" }),
        template: "<story/>",
      };
    },
  ],
};

export const Card = {
  args: { server: makeServer(ServerStatus.Started), detailed: false },
};

export const CardStopped = {
  args: { server: makeServer(ServerStatus.Stopped), detailed: false },
};

export const Detailed = {
  args: { server: makeServer(ServerStatus.Started), detailed: true },
};

export const DetailedStopped = {
  args: { server: makeServer(ServerStatus.Stopped), detailed: true },
};

/** Starts the server through the toggle button and waits for it to come up. */
export const StartServer = {
  args: { server: makeServer(ServerStatus.Stopped), detailed: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const start = await canvas.findByRole("button", { name: /^start$/i });
    await waitFor(() => expect(start).toBeEnabled());
    await userEvent.click(start);
    await waitFor(
      async () =>
        expect(
          await canvas.findByRole("button", { name: /^stop$/i })
        ).toBeInTheDocument(),
      { timeout: 3000 }
    );
    await expect(canvas.getAllByText("Started").length).toBeGreaterThan(0);
  },
};

/** Pauses a running server. */
export const PauseServer = {
  args: { server: makeServer(ServerStatus.Started), detailed: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const pause = await canvas.findByRole("button", { name: /^pause$/i });
    await waitFor(() => expect(pause).toBeEnabled());
    await userEvent.click(pause);
    await expect(
      await canvas.findByRole("button", { name: /^unpause$/i })
    ).toBeVisible();
  },
};

export const AllStatuses = {
  render: () => ({
    components: { ServerComponent },
    data: () => ({
      servers: Object.values(prepareEnum(ServerStatus)).map((status) =>
        makeServer(
          status as ServerStatus,
          `Server ${ServerStatus[status as ServerStatus]}`
        )
      ),
    }),
    template: `<div><ServerComponent v-for="s in servers" :key="s.name" :server="s" :detailed="false" class="mb-4" /></div>`,
  }),
};

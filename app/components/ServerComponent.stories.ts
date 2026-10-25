import { expect, userEvent, waitFor, within } from "storybook/test";
import ServerComponent from "@/components/ServerComponent.vue";
import Server from "@/lib/components/server";
import { ServerStatus } from "#shared/components/server";
import { MessageType } from "#shared/components/message";
import ResourceUsage from "#shared/components/resource_usage";
import prepareEnum from "../../.storybook/enumPrepare";

const JAVA_PATH = "/usr/lib/jvm/java-17/bin/java";
const javaRuntimes = [
  { _path: JAVA_PATH, _name: "OpenJDK 17", _isDefault: true },
  { _path: "/usr/lib/jvm/java-21/bin/java", _name: "OpenJDK 21" },
];
const FIXTURE_TIME = new Date("2024-01-01T12:00:00.000Z").getTime();

const jojomatikHead =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsSAAALEgHS3X78AAAA+ElEQVQYlR3JzUvCYACA8fefCyKs7OKgD7oF1bFTEAQimhGVRXRZxJY1FGOQs3RQZAeLIjqkESgbUSB9rMQ1Nip4wh2ey/MTbX2ShiLxehjDUgZoaWPYuQnu5QjPWhRhZ6NYmkRTHaF1MMqDKmFnh3jKj2Opg4iXfAzHzPBWTOEYSdzTDfyzdb4ryzSVYcTvxRZBEBCfy8FjEeoF5qf3IHD5NDOIn+om3rXGX8MIMexmF7e6jVNeRXTMNd7PZa5mI3C3D3Wd25l+gkqKzvES4uMowVcpjV+TuZzqC/NrO+HrmWgXFnD0RbpGHO8kiVdO0zVXcEoJevYPlgLGCbqeWAwAAAAASUVORK5CYII=";

const itspolderHead =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsSAAALEgHS3X78AAAAmUlEQVQYlWPI9TD6n+qs/x9El/ia/U+w0/kfa6sN5oNohmIfU7Bgor3ufxAbRsPYDCBJGOfDvjlgDGLDMEOYpcb/7xc2/P96Yx+Y/nx4EZztbaj8n+Hjvjn/v768/T/UQv3/j5v7/38+uADMBomB5FAU/Hx48v+7Lf2oCt5u6AEzPh+cDzYWhkFiIDmGZzOLwAyQADIGiYHkAMEjq+CVYnJuAAAAAElFTkSuQmCC";

/** A {@link Server} whose network calls are simulated in memory. */
class MockServer extends Server {
  override async sendAction(action: string) {
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

  override async updateConfig() {
    return new Response();
  }

  override async fetchInfo() {
    return {};
  }

  override async fetchMessages() {
    return [
      {
        _timestamp: FIXTURE_TIME - 5000,
        _uuid: "m1",
        _type: MessageType.Default,
        _text: '[Server thread/INFO]: Done (3.2s)! For help, type "help"',
      },
    ];
  }

  override async fetchUpdates() {
    return {
      current: { version: "1.20.4", build: 400 },
      build: { version: "1.20.4", build: 497 },
      patch: { version: "1.20.6", build: 151 },
    };
  }

  override async installUpdate() {
    return new Response();
  }

  override async fetchPaperVersions() {
    return ["1.20.6", "1.20.4", "1.19.4"];
  }

  override async fetchPaperBuilds() {
    return [{ build: 497, time: "2024-03-01T12:00:00.000Z" }];
  }

  override async fetchOldJars() {
    return ["paper-1.20.2-318.jar"];
  }

  override async installExistingJar() {
    return new Response();
  }

  override async installVersion() {
    return new Response();
  }

  override async sendCommand() {
    return new Response();
  }

  override async acceptEula() {
    this.status = ServerStatus.Starting;
    setTimeout(() => (this.status = ServerStatus.Started), 300);
    return new Response();
  }
}

const eulaText =
  "[Server thread/INFO]: You need to agree to the EULA in order to run the server. Go to eula.txt for more info.";

/** A stopped {@link Server} whose console history ends with the given messages. */
function makeServerWithMessages(texts: string[]) {
  const server = makeServer(ServerStatus.Stopped);
  server.fetchMessages = async () =>
    texts.map((text, i) => ({
      _timestamp: FIXTURE_TIME - (texts.length - i) * 1000,
      _uuid: `eula-${i}`,
      _type: MessageType.Default,
      _text: text,
    }));
  return server;
}

function makeServer(status: ServerStatus, name = "Survival World") {
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
          FIXTURE_TIME - (20 - i) * 5000,
          0.2 + 0.1 * Math.sin(i),
          800_000_000 + i * 5_000_000,
        ),
    ),
  } as ConstructorParameters<typeof Server>[0]);
}

const mockFetch = () => {
  window.fetch = (async (url: RequestInfo | URL) =>
    new Response(
      JSON.stringify(String(url).includes("java-runtimes") ? javaRuntimes : {}),
    )) as typeof window.fetch;
};

export default {
  title: "Organisms/ServerComponent",
  component: ServerComponent,
  argTypes: {
    detailed: { control: "boolean" },
  },
  decorators: [
    () => {
      let originalFetch: typeof window.fetch;
      return {
        beforeMount() {
          originalFetch = window.fetch;
          mockFetch();
        },
        mounted() {
          window.fetch = originalFetch;
        },
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

/** Opens the version dialog, which contains the update buttons. */
export const VersionDialog = {
  args: { server: makeServer(ServerStatus.Stopped), detailed: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /change version/i }),
    );
    const body = within(document.body);
    await expect(
      await body.findByRole("button", {
        name: /update to build 497 \(1\.20\.4\)/i,
      }),
    ).toBeEnabled();
    await expect(
      await body.findByRole("button", { name: /update to 1\.20\.6/i }),
    ).toBeEnabled();
  },
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
          await canvas.findByRole("button", { name: /^stop$/i }),
        ).toBeInTheDocument(),
      { timeout: 3000 },
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
      await canvas.findByRole("button", { name: /^unpause$/i }),
    ).toBeVisible();
  },
};

/** Shows the EULA dialog, which only allows starting after agreeing, and starts the server. */
export const EulaDialog = {
  args: {
    server: makeServerWithMessages(["Loading libraries", eulaText]),
    detailed: true,
  },
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(
      dialog.getByRole("link", { name: /read the minecraft eula/i }),
    ).toHaveAttribute("href", "https://www.minecraft.net/en-us/eula");
    await expect(
      dialog.getByRole("button", { name: /^start server$/i }),
    ).toBeDisabled();
  },
};

/** Accepts the EULA and starts the server. Not snapshotted, as the dialog is closed afterwards. */
export const EulaDialogAccept = {
  ...EulaDialog,
  parameters: { chromatic: { disableSnapshot: true } },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    const start = dialog.getByRole("button", { name: /^start server$/i });
    await expect(start).toBeDisabled();
    const agree = dialog.getByText(/i agree to the minecraft eula/i);
    // The dialog ignores pointer events while it is still animating in.
    await waitFor(async () => {
      await expect(getComputedStyle(agree).pointerEvents).not.toBe("none");
      await userEvent.click(agree);
    });
    await waitFor(() => expect(start).toBeEnabled());
    await userEvent.click(start);
    await waitFor(
      async () =>
        expect(
          await within(canvasElement).findByRole("button", { name: /^stop$/i }),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
  },
};

/** The EULA message is followed by later messages, so the dialog must not open again. */
export const EulaAlreadyAccepted = {
  args: {
    server: makeServerWithMessages([
      eulaText,
      "[Server thread/INFO]: Starting minecraft server",
      '[Server thread/INFO]: Done (3.2s)! For help, type "help"',
    ]),
    detailed: true,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(
      await within(canvasElement).findByText(/Done \(3\.2s\)/),
    ).toBeVisible();
    await expect(
      within(document.body).queryByRole("dialog"),
    ).not.toBeInTheDocument();
  },
};

export const AllStatuses = {
  render: () => ({
    components: { ServerComponent },
    data: () => ({
      servers: Object.values(prepareEnum(ServerStatus)).map((status) =>
        makeServer(
          status as ServerStatus,
          `Server ${ServerStatus[status as ServerStatus]}`,
        ),
      ),
    }),
    template: `<div><ServerComponent v-for="s in servers" :key="s.name" :server="s" :detailed="false" class="mb-4" /></div>`,
  }),
};

import { expect, userEvent, within } from "storybook/test";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import { ServerStatus } from "#shared/components/server";
import { MessageType } from "#shared/components/message";
import prepareEnum from "../../.storybook/enumPrepare";

const now = Date.now();
const msg = (i: number, type: MessageType, text: string) => ({
  _timestamp: now - 60000 + i * 1000,
  _uuid: `story-${i}`,
  _type: type,
  _text: text,
});

const initialMessages = [
  msg(1, MessageType.Blockcluster, "Starting server..."),
  msg(
    2,
    MessageType.Default,
    '[Server thread/INFO]: Done (3.2s)! For help, type "help"',
  ),
  msg(3, MessageType.Error, "[Server thread/WARN]: Can't keep up!"),
];

function makeServer(overrides: Record<string, unknown> = {}) {
  return {
    name: "Story Server",
    fetchMessages: async () => initialMessages,
    sendCommand: async () => ({ ok: true, status: 200, statusText: "OK" }),
    ...overrides,
  };
}

export default {
  title: "Organisms/ConsoleComponent",
  component: ConsoleComponent,
  argTypes: {
    status: { control: "select", options: prepareEnum(ServerStatus) },
  },
};

export const Running = {
  args: { server: makeServer(), status: ServerStatus.Started },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Can't keep up/)).toBeVisible();
    const input = canvasElement.querySelector("input") as HTMLInputElement;
    await userEvent.type(input, "say hello{enter}");
    await expect(input).toHaveValue("say hello");
  },
};

export const Stopped = {
  args: { server: makeServer(), status: ServerStatus.Stopped },
};

export const FailingCommand = {
  args: {
    server: makeServer({
      sendCommand: async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }),
    }),
    status: ServerStatus.Started,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector("input") as HTMLInputElement;
    await userEvent.type(input, "stop{enter}");
    await expect(
      await canvas.findByText(/Could not send command/),
    ).toBeVisible();
  },
};

export const LoadError = {
  args: {
    server: makeServer({
      fetchMessages: async () => {
        throw new Error("network down");
      },
    }),
    status: ServerStatus.Started,
  },
};

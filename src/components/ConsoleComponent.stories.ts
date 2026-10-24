import Vue from "vue";
import { expect } from "@storybook/jest";
import { userEvent, within } from "@storybook/testing-library";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import { ServerStatus } from "../../common/components/server";
import { MessageType } from "../../common/components/message";
import prepareEnum from "../../.storybook/enumPrepare";

// The component subscribes to socket.io events; stub the client for stories.
(Vue.prototype as Record<string, unknown>).$socket = {
  client: { on: () => undefined, off: () => undefined },
};

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
    '[Server thread/INFO]: Done (3.2s)! For help, type "help"'
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
  title: "Components/ConsoleComponent",
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
      await canvas.findByText(/Could not send command/)
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

import { expect } from "@storybook/jest";
import { userEvent, within } from "@storybook/testing-library";
import ToggleButtonComponent from "@/components/buttons/ToggleButtonComponent.vue";
import { ServerStatus } from "../../../common/components/server";
import prepareEnum from "../../../.storybook/enumPrepare";

export default {
  title: "Components/ToggleButtonComponent",
  component: ToggleButtonComponent,
  argTypes: {
    status: { control: "select", options: prepareEnum(ServerStatus) },
    start: { action: "start" },
    stop: { action: "stop" },
  },
};

export const Stopped = {
  args: { status: ServerStatus.Stopped, disabled: false },
};

export const Started = {
  args: { status: ServerStatus.Started, disabled: false },
};

export const Disabled = {
  args: { status: ServerStatus.Stopped, disabled: true },
};

/** Clicking toggles through a simulated start/stop lifecycle. */
export const Interactive = {
  render: () => ({
    components: { ToggleButtonComponent },
    data: () => ({ status: ServerStatus.Stopped }),
    methods: {
      start(this: { status: ServerStatus }) {
        this.status = ServerStatus.Starting;
        setTimeout(() => (this.status = ServerStatus.Started), 300);
      },
      stop(this: { status: ServerStatus }) {
        this.status = ServerStatus.Stopped;
      },
    },
    template: `<ToggleButtonComponent :status="status" @start="start" @stop="stop" />`,
  }),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /start/i })
    );
    const stop = await canvas.findByRole("button", { name: /stop/i });
    await expect(stop).toBeEnabled();
  },
};

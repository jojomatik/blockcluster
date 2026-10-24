import { expect } from "@storybook/jest";
import { userEvent, within } from "@storybook/testing-library";
import PauseButtonComponent from "@/components/buttons/PauseButtonComponent.vue";
import { ServerStatus } from "../../../common/components/server";
import prepareEnum from "../../../.storybook/enumPrepare";

export default {
  title: "Molecules/PauseButtonComponent",
  component: PauseButtonComponent,
  argTypes: {
    status: { control: "select", options: prepareEnum(ServerStatus) },
    pause: { action: "pause" },
    unpause: { action: "unpause" },
  },
};

export const Started = {
  args: { status: ServerStatus.Started, disabled: false },
};

export const Paused = {
  args: { status: ServerStatus.Paused, disabled: false },
};

export const DisabledWhileStopped = {
  args: { status: ServerStatus.Stopped, disabled: false },
};

/** Pausing and unpausing flips the button label. */
export const Interactive = {
  render: () => ({
    components: { PauseButtonComponent },
    data: () => ({ status: ServerStatus.Started }),
    template: `<PauseButtonComponent :status="status"
      @pause="status = ${ServerStatus.Paused}"
      @unpause="status = ${ServerStatus.Started}" />`,
  }),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /pause/i })
    );
    await expect(
      await canvas.findByRole("button", { name: /resume|unpause|continue/i })
    ).toBeVisible();
  },
};

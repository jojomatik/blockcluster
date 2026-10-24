import { expect } from "@storybook/jest";
import { userEvent, waitFor, within } from "@storybook/testing-library";
import CreateServerDialogComponent from "@/components/CreateServerDialogComponent.vue";

export default {
  title: "Molecules/CreateServerDialogComponent",
  component: CreateServerDialogComponent,
};

export const Default = {};

export const Open = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const originalFetch = window.fetch;
    window.fetch = async () =>
      new Response(JSON.stringify(["1.21.8", "1.21.7", "1.20.6"]));
    try {
      const canvas = within(canvasElement);
      await userEvent.click(
        await canvas.findByRole("button", { name: /create server/i })
      );
      const body = within(document.body);
      await waitFor(async () => {
        await expect(
          await body.findByLabelText(/server directory name/i)
        ).toBeVisible();
      });
      await expect(await body.findByLabelText(/paper version/i)).toBeVisible();
      await expect(
        await body.findByRole("button", { name: /^create$/i })
      ).toBeDisabled();
    } finally {
      window.fetch = originalFetch;
    }
  },
};

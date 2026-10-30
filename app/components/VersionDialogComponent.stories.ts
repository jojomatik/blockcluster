import VersionDialogComponent from "@/components/VersionDialogComponent.vue";
import Server from "@/lib/components/server";
import { expect, userEvent, waitFor, within } from "storybook/test";

class MockServer extends Server {
  override async installExistingJar() {
    return new Response();
  }

  override async installUpdate() {
    return new Response();
  }

  override async installVersion() {
    return new Response();
  }
}

function mockFetch() {
  window.fetch = async (input) => {
    const url = new URL(String(input), window.location.origin);
    let data: unknown = {};
    if (url.pathname === "/api/paper/versions")
      data = ["1.21.8", "1.21.7", "1.20.6"];
    else if (url.pathname.endsWith("/oldjars"))
      data = ["paper-1.20.4-400.jar", "custom.jar"];
    else if (/^\/api\/paper\/versions\/.+\/builds$/.test(url.pathname))
      data = [
        { build: 60, time: "2025-09-06T21:50:11.982Z" },
        { build: 59, time: "2025-09-06T21:03:20.324Z" },
      ];
    return new Response(JSON.stringify(data));
  };
}

export default {
  title: "Molecules/VersionDialogComponent",
  component: VersionDialogComponent,
  argTypes: {
    disabled: { control: "boolean" },
  },
  decorators: [
    () => {
      let originalFetch: typeof window.fetch;
      return {
        beforeMount() {
          originalFetch = window.fetch;
          mockFetch();
        },
        beforeUnmount() {
          window.fetch = originalFetch;
        },
        template: "<story/>",
      };
    },
  ],
};

const updates = {
  build: { version: "1.21.8", build: 70 },
  patch: { version: "1.21.10", build: 5 },
};

const server = new MockServer({ _name: "Survival World" });

export const Default = {
  args: { server, disabled: false, updates },
};

export const Disabled = {
  args: { server, disabled: true },
};

/** Opens the dialog, which shows the updates and both selects directly. */
export const Open = {
  args: { server, disabled: false, updates },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: /change version/i,
      }),
    );
    const body = within(document.body);
    // Wait for the dialog's opening transition to finish.
    await waitFor(
      async () => {
        await expect(
          await body.findByRole("button", {
            name: /update to build 70 \(1\.21\.8\)/i,
          }),
        ).toBeVisible();
      },
      { timeout: 5000 },
    );
    await expect(
      await body.findByRole("button", { name: /update to 1\.21\.10/i }),
    ).toBeVisible();
    await expect(
      await body.findByText("Download new Paper version"),
    ).toBeVisible();
    await expect(
      await body.findByText("Select existing version"),
    ).toBeVisible();
    for (const install of await body.findAllByRole("button", {
      name: /^install$/i,
    }))
      await expect(install).toBeDisabled();
  },
};

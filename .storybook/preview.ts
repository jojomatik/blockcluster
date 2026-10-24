import type { Decorator } from "@storybook/vue";
import vuetify from "./vuetify_storybook";
import i18n from "@/i18n";

export const decorators: Decorator[] = [
  () => ({
    i18n,
    vuetify,
    template: `
    <v-app>
      <v-main>
        <story/>
      </v-main>
    </v-app>
    `,
  }),
];

export const parameters = {
  options: {
    storySort: { order: ["Blockcluster", "Atoms", "Molecules", "Organisms"] },
  },
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

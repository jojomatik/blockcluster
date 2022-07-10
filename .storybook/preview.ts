import { addDecorator } from '@storybook/vue';
import vuetify from './vuetify_storybook';
import i18n from "@/i18n";

addDecorator(() => ({
  i18n,
  vuetify,
  template: `
    <v-app>
      <v-main>
        <story/>
      </v-main>
    </v-app>
    `,
}));

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
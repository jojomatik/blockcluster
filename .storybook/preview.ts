import "@fontsource/roboto/400.css";

import themeLocaleDecorator, {
  DEFAULT_THEME,
} from "./theme-locale-decorator.decorator";
import type { Preview } from "@nuxtjs/storybook";

const preview: Preview = {
  initialGlobals: {
    locale: "en",
    theme: DEFAULT_THEME,
  },
  globalTypes: {
    locale: {
      name: "Locale",
      description: "Internationalization locale",
      toolbar: {
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "de", title: "Deutsch" },
        ],
      },
    },
    theme: {
      name: "Theme",
      description: "Global theme for components",
      toolbar: {
        icon: "circlehollow",
        // Array of plain string values or MenuItem shape (see below)
        items: [
          { value: "light", title: "Light", icon: "circlehollow" },
          { value: "dark", title: "Dark", icon: "circle" },
        ],
        // Change title based on selected value
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    options: {
      storySort: { order: ["Blockcluster", "Atoms", "Molecules", "Organisms"] },
    },
    actions: { argTypesRegex: "^on[A-Z].*" },
  },
  decorators: [themeLocaleDecorator],
  tags: ["autodocs"],
};

export default preview;

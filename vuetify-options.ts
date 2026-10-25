import type { VOptions } from "vuetify-nuxt-module";

const vuetifyOptions: VOptions = {
  // Keep the look of Vuetify 2: filled chips and buttons (also inside
  // v-card-actions) and underlined form fields.
  defaults: {
    VChip: { variant: "flat" },
    VCardActions: { VBtn: { variant: "elevated" } },
    VTextField: { variant: "underlined" },
    VSelect: { variant: "underlined" },
    VTextarea: { variant: "underlined" },
  },
  theme: {
    defaultTheme: "light",
    // Used for the lightened accent color of console messages.
    variations: { colors: ["accent"], lighten: 2, darken: 0 },
    themes: {
      light: {
        dark: false,
        colors: {
          background: "#FFFFFF",
          surface: "#FFFFFF",
          "surface-variant": "#424242",
          "on-surface-variant": "#EEEEEE",
          primary: "#E1E1E1",
          "on-primary": "#000000",
          secondary: "#004c6d",
          accent: "#037a7a",
          error: "#B00020",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FB8C00",
        },
      },
      dark: {
        dark: true,
        colors: {
          background: "#121212",
          surface: "#212121",
          "surface-variant": "#BDBDBD",
          "on-surface-variant": "#424242",
          primary: "#1E1E1E",
          "on-primary": "#FFFFFF",
          secondary: "#0074a5",
          accent: "#039e9e",
          error: "#CF6679",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FB8C00",
        },
      },
    },
  },
};

export default vuetifyOptions;

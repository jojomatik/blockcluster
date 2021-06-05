import Vue from "vue";
import Vuetify from "vuetify/lib/framework";

Vue.use(Vuetify);

export default new Vuetify({
  options: {
    customProperties: true,
  },
  theme: {
    themes: {
      light: {
        primary: "#E1E1E1",
        text: "#000000",
        secondary: "#004c6d",
        accent: "#037a7a",
      },
      dark: {
        primary: "#1E1E1E",
        text: "#FFFFFF",
        secondary: "#0074a5",
        accent: "#039e9e",
      },
    },
  },
});

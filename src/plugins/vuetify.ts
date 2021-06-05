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
        secondary: "#004c6d",
        accent: "#037a7a",
      },
    },
  },
});

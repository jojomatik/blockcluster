import Vue from "vue";
import Vuetify from "vuetify";

Vue.use(Vuetify);
Vue.config.warnHandler = (message, _vm, trace) => {
  throw new Error(`Vue warning: ${message}${trace}`);
};

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation((...messages) => {
    throw new Error(`Unexpected console.error: ${messages.join(" ")}`);
  });
  jest.spyOn(console, "warn").mockImplementation((...messages) => {
    throw new Error(`Unexpected console.warn: ${messages.join(" ")}`);
  });
});

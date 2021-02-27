import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import * as socketio from "socket.io-client";
import VueSocketIO from "vue-socket.io";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

Vue.use(
  new VueSocketIO({
    debug: true,
    connection: socketio.io(), //options object is Optional
    vuex: {
      store,
      actionPrefix: "SOCKET_",
      mutationPrefix: "SOCKET_"
    }
  })
);

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");

/*
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import * as socketio from "socket.io-client";
import VueSocketIOExt from "vue-socket.io-extended";
import vuetify from "./plugins/vuetify";
import VueMeta from "vue-meta";
import VueApexCharts from "vue-apexcharts";
import i18n from "./i18n";
import "@fontsource/roboto";

Vue.config.productionTip = false;

Vue.use(VueSocketIOExt, socketio.io());

Vue.use(VueMeta);

Vue.use(VueApexCharts);

new Vue({
  router,
  vuetify,
  i18n,
  render: (h) => h(App),
}).$mount("#app");

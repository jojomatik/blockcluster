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
import Vuetify from "vuetify/lib/framework";
import "@mdi/font/css/materialdesignicons.css";
import { UserVuetifyPreset } from "vuetify";

Vue.use(Vuetify);

/**
 * The preset used in the vuetify instance.
 */
export const preset: Partial<UserVuetifyPreset> = {
  theme: {
    options: {
      customProperties: true,
    },
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
  icons: {
    iconfont: "mdi",
  },
};

export default new Vuetify(preset);

<!--
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
-->

<template>
  <div class="server">
    <Server v-bind:detailed="true" v-bind:server="server"></Server>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ServerComponent from "@/components/ServerComponent.vue"; // @ is an alias to /src
import Server, { ServerStatus } from "../../common/components/server";

/**
 * A {@link Vue}-View that shows one server.
 */
@Component<ServerView>({
  components: {
    Server: ServerComponent,
  },
  metaInfo() {
    return { title: this.server.name };
  },
})
export default class ServerView extends Vue {
  /**
   * The server shown in this {@ServerView}.
   * @private
   */
  private server = new Server("", ServerStatus.Unknown, 0);
}
</script>

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
  <v-container class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Total resource usage</v-card-title>
          <v-card-text>
            <ResourceChartComponent :resource-usage="getTotalUsage()">
            </ResourceChartComponent>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-for="server in servers" v-bind:key="server.name" dense>
      <v-col cols="12">
        <Server v-bind:detailed="false" v-bind:server="server"></Server>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-btn color="secondary" v-on:click="sendMessage">
          <v-icon left light>mdi-reload</v-icon>
          Update Status
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ServerComponent from "@/components/ServerComponent.vue"; // @ is an alias to /src
import Server from "../../common/components/server";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import ResourceUsage from "../../common/components/resource_usage";
import Player from "../../common/components/player";

@Component({
  components: {
    ResourceChartComponent,
    Server: ServerComponent,
  },
  metaInfo: {
    title: "Home",
  },
})
export default class Home extends Vue {
  // noinspection JSMismatchedCollectionQueryUpdate
  private servers: Server[] = [];

  constructor() {
    super();
    this.updateServers();
  }

  sendMessage(): void {
    this.$socket.emit("SEND_MESSAGE", JSON.stringify({ servers: [] }));
  }

  mounted() {
    this.sockets.subscribe("MESSAGE", (data: Record<string, unknown>[]) => {
      this.servers = [];
      data.forEach((elem: Record<string, unknown>) => {
        const server: Server = Object.assign(new Server(), elem);
        server.players.sample = server.players.sample.map((player) => {
          return Object.assign(new Player(), player);
        });
        this.servers.push(server);
      });
    });
  }

  /**
   * Unsubscribes the channel subscribed to in {@link #mounted}.
   */
  destroyed() {
    this.sockets.unsubscribe("MESSAGE");
  }

  updateServers() {
    this.sendMessage();
  }

  /**
   * Cached version of the total resource usage.
   *
   * Used if not all servers are updated yet.
   * @private
   */
  private totalUsage: ResourceUsage[] = [];

  /**
   * Returns the total resource usage.
   *
   * If all servers have the same length of resource objects, the usage is computed from the sum of the servers' usages.
   *
   * Otherwise the cached version {@link totalUsage} is returned.
   */
  getTotalUsage(): ResourceUsage[] {
    // Return cached usage, if no servers are available.
    if (this.servers.length == 0) return this.totalUsage;

    // Return cached usage, if lengths dont equal or the first timestamp doesn't equal. This means that not all servers have been updated yet.
    const len = this.servers[0].resourceUsage.length;
    const time = this.servers[0].resourceUsage[0].time;
    for (let i = 1; i < this.servers.length; i++) {
      if (
        this.servers[i].resourceUsage.length != len ||
        this.servers[i].resourceUsage[0].time != time
      )
        return this.totalUsage;
    }

    const usages: ResourceUsage[] = [];
    for (let i = 0; i < len; i++) {
      let cpu = 0;
      let memory = 0;
      this.servers.forEach((server) => {
        cpu += server.resourceUsage[i].cpu;
        memory += server.resourceUsage[i].memory;
      });
      usages.push(
        new ResourceUsage(this.servers[0].resourceUsage[i].time, cpu, memory)
      );
    }
    return (this.totalUsage = usages);
  }
}
</script>

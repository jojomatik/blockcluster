<template>
  <v-container class="home" fluid>
    <v-row v-for="server in servers" v-bind:key="server.name" dense>
      <v-col cols="12">
        <Server v-bind:detailed="false" v-bind:server="server"></Server>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-btn color="primary" v-on:click="sendMessage">
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
import Server, { ServerStatus } from "../../common/components/server";

@Component({
  components: {
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
    this.sockets.subscribe("MESSAGE", (data: string) => {
      this.servers = [];
      JSON.parse(data).forEach((elem: Record<string, unknown>) => {
        this.servers.push(
          Object.assign(new Server("", ServerStatus.Unknown, 25565), elem)
        );
      });
    });
  }

  updateServers() {
    this.sendMessage();
  }
}
</script>

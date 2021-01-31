<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" />
    <Server
      v-for="server in servers"
      v-bind:key="server.name"
      v-bind:server="server"
    ></Server>
    <button v-on:click="sendMessage">Update Status</button>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import HelloWorld from "@/components/HelloWorld.vue";
import ServerComponent from "@/components/ServerComponent.vue"; // @ is an alias to /src
import Server, { ServerStatus } from "../../common/components/server";

@Component({
  components: {
    HelloWorld,
    Server: ServerComponent
  }
})
export default class Home extends Vue {
  // noinspection JSMismatchedCollectionQueryUpdate
  private servers: Server[] = [
    new Server("Crystal", ServerStatus.Online),
    new Server("Not Crystal", ServerStatus.Unknown)
  ];

  sendMessage(): void {
    this.$socket.emit("SEND_MESSAGE", JSON.stringify({ servers: [] }));
  }

  mounted() {
    this.sockets.subscribe("MESSAGE", (data: []) => {
      this.servers = [];
      data.forEach((elem: Record<string, unknown>) => {
        this.servers.push(
          Object.assign(new Server("", ServerStatus.Unknown), elem)
        );
      });
    });
  }
}
</script>

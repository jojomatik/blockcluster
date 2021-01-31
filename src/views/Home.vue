<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" />
    <Server
      v-for="server in servers"
      v-bind:key="server.name"
      v-bind:server="server"
    ></Server>
    <button v-on:click="sendMessage">Send Message</button>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import HelloWorld from "@/components/HelloWorld.vue";
import ServerComponent from "@/components/ServerComponent.vue"; // @ is an alias to /src
import Server, { ServerStatus } from "@/ts/components/server";

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
    this.$socket.emit("SEND_MESSAGE", JSON.stringify(this.servers));
  }

  mounted() {
    this.sockets.subscribe("MESSAGE", (data: string) => {
      console.log(data);
    });
  }
}
</script>

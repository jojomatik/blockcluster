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
@Component({
  components: {
    Server: ServerComponent,
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

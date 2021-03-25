<template>
  <v-card
    dark
    height="500"
    style="display: flex; flex-direction: column"
    class="mt-4"
  >
    <v-card-title>Console</v-card-title>
    <v-card-text
      style="
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        overflow: hidden;
      "
      class="pb-4 pt-4"
    >
      <v-row class="mt-0 mb-0" style="overflow: auto">
        <v-col>
          <v-row v-bind:key="message.uuid" v-for="message in this.messages">
            <v-col class="py-0">
              <span v-if="message.type === MessageType.Error" class="red--text">
                {{ message.text }}
              </span>
              <span v-else>{{ message.text }}</span>
            </v-col>
          </v-row>
          <span ref="consoleEnd" class="pb-2" />
        </v-col>
      </v-row>

      <v-row style="display: flex; margin-top: auto; flex-grow: 0">
        <v-col style="display: flex; flex-direction: row">
          <span style="font-size: 16px" class="py-1">> </span>
          <v-form @submit.prevent="sendCommand()" style="flex-grow: 1">
            <v-text-field
              dense
              class="pt-0 mt-0 ml-2"
              hide-details
              v-model="command"
              :disabled="this.status !== ServerStatus.Started"
            />
          </v-form>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";
import Message, { MessageType } from "../../common/components/message";
import ServerComponent from "@/components/ServerComponent.vue";

/**
 * The representation of a {@link Server}'s console in Vue.
 */
@Component({
  components: {
    ServerComponent,
  },
  data() {
    return { ServerStatus, MessageType };
  },
})
export default class ConsoleComponent extends Vue {
  /**
   * The linked {@link ServerComponent}.
   * @private
   */
  @Prop() private server!: ServerComponent;

  /**
   * The status of the {@link ServerComponent}.
   * @private
   */
  @Prop() private status!: ServerStatus;

  /**
   * The command that is currently written in the console input.
   * @private
   */
  private command = "";

  /**
   * The list of messages of this server.
   */
  // noinspection JSMismatchedCollectionQueryUpdate
  private messages: Message[] = [];

  constructor() {
    super();
    this.getMessages();
  }

  /**
   * Listens to a channel named according to the {@link Server}'s name for updated information.
   */
  mounted() {
    this.sockets.subscribe(
      "server_" + encodeURIComponent(this.server.getName()),
      async (data: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(data, "message")) {
          if (Array.isArray(data["message"]))
            await Promise.all(
              data["message"].map(
                async (message) =>
                  await this.messages.push(
                    Object.assign(new Message(), message)
                  )
              )
            );
          else
            await this.messages.push(
              Object.assign(new Message(), data["message"])
            );
          this.scrollConsole();
        }
      }
    );
  }

  /**
   * Scrolls the console to last line.
   * @private
   */
  private scrollConsole() {
    const ref = this.$refs["consoleEnd"];
    let el: Element | null = null;
    if (Array.isArray(ref)) {
      if (ref[0] instanceof Element) el = ref[0];
    } else if (ref instanceof Element) {
      el = ref;
    }
    if (el !== null) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  /**
   * Sends a message `getMessages` to the corresponding channel. The backend is expected to return the latest 50 messages.
   * @private
   */
  private getMessages(): void {
    this.server.sendMessage("getMessages");
  }

  /**
   * Sends a server command from the console input to the server.
   * @private
   */
  private sendCommand() {
    this.server.sendMessage("command " + this.command);
  }
}
</script>

<style scoped></style>

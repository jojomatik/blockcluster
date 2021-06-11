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
  <v-card
    dark
    color="black"
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
      <v-row class="mt-0 mb-0" style="overflow: auto" ref="console">
        <v-col>
          <v-row v-bind:key="message.uuid" v-for="message in this.messages">
            <v-col class="py-0">
              <span v-if="message.type === MessageType.Error" class="red--text">
                {{ message.text }}
              </span>
              <span
                style="color: teal; text-decoration: underline"
                v-else-if="message.type === MessageType.DateChange"
              >
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
import moment from "moment";

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
          const len = this.messages.length;
          if (Array.isArray(data["message"]))
            for (let i = len; i < len + data["message"].length; i++) {
              if (i == 0) await this.addDatetimeMessage(data["message"][i]);
              else
                await this.addDatetimeMessage(
                  data["message"][i],
                  data["message"][i - 1]._timestamp
                );
              await this.messages.push(
                Object.assign(new Message(), data["message"][i])
              );
            }
          else {
            if (len == 0)
              await this.addDatetimeMessage(
                data["message"] as {
                  _timestamp: number;
                }
              );
            else
              await this.addDatetimeMessage(
                data["message"] as {
                  _timestamp: number;
                },
                this.messages[len - 1].timestamp
              );
            await this.messages.push(
              Object.assign(new Message(), data["message"])
            );
          }
          this.scrollConsole();
        }
      }
    );
  }

  /**
   * Unsubscribes the channel subscribed to in {@link #mounted}.
   */
  destroyed() {
    this.sockets.unsubscribe(
      "server_" + encodeURIComponent(this.server.getName())
    );
  }

  /**
   * Adds a date time message if necessary.
   * @param message the new message.
   * @param lastTimestamp the timestamp of the last message.
   *
   * @private
   */
  private async addDatetimeMessage(
    message: { _timestamp: number },
    lastTimestamp?: number
  ) {
    const newDate = moment(message._timestamp);
    if (
      !lastTimestamp ||
      Math.floor(lastTimestamp / (24 * 60 * 60 * 1000)) <
        Math.floor(message._timestamp / (24 * 60 * 60 * 1000))
    )
      await this.messages.push(
        new Message(MessageType.DateChange, newDate.format("YYYY-MM-DD"))
      );
  }

  /**
   * Scrolls the console to last line.
   * @private
   */
  private scrollConsole() {
    const ref = this.$refs["consoleEnd"];
    let el: HTMLElement | null = null;
    if (Array.isArray(ref)) {
      if (ref[0] instanceof HTMLElement) el = ref[0];
    } else if (ref instanceof HTMLElement) {
      el = ref;
    }
    if (el !== null) {
      (this.$refs["console"] as Element).scroll({
        top: el.offsetTop,
        behavior: "smooth",
      });
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

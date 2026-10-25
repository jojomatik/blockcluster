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
    theme="dark"
    color="black"
    height="500"
    style="display: flex; flex-direction: column"
    class="mt-4"
  >
    <v-card-title>{{ t("gui.views.server.console.title") }}</v-card-title>
    <v-card-text
      style="
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        overflow: hidden;
      "
      class="console-text pb-4 pt-4"
    >
      <v-row ref="consoleRow" class="mt-0 mb-0" style="overflow: auto">
        <v-col>
          <v-row v-for="message in messages" :key="message.uuid">
            <v-col class="py-0">
              <span v-if="message.type === MessageType.Error" class="text-red">
                {{ message.text }}
              </span>
              <span
                v-else-if="message.type === MessageType.DateChange"
                class="blockcluster-message"
                style="text-decoration: underline"
              >
                {{ message.text }}
              </span>
              <span
                v-else-if="message.type === MessageType.Blockcluster"
                class="blockcluster-message"
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
          <v-form style="flex-grow: 1" @submit.prevent="sendCommand()">
            <v-text-field
              v-model="command"
              density="compact"
              class="pt-0 mt-0 ml-2"
              hide-details
              :disabled="status !== ServerStatus.Started"
            />
          </v-form>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { ServerStatus } from "#shared/components/server";
import Message, { MessageType } from "#shared/components/message";
import type Server from "@/lib/components/server";

/**
 * The representation of a {@link Server}'s console in Vue.
 */
const props = defineProps<{
  /**
   * The linked {@link Server}.
   */
  server: Server;

  /**
   * The status of the {@link ServerComponent}.
   */
  status: ServerStatus;
}>();

const emit = defineEmits<{ (e: "eula-required"): void }>();

const { t } = useI18n();
const route = useRoute();
const socket = useSocket();

/**
 * The command that is currently written in the console input.
 */
const command = ref("");

/**
 * The list of messages of this server.
 */
const messages = ref<Message[]>([]);

let messagesLoading = true;

let bufferedMessages: Record<string, unknown>[] = [];

/**
 * Whether or not the console is scrolling at the moment.
 */
let scrolling = false;

/**
 * Whether or not the console has been requested to scroll.
 */
let scrollRequested = false;

const consoleRow = ref<{ $el: HTMLElement } | null>(null);
const consoleEnd = ref<HTMLElement | null>(null);

function serverChannel(): string {
  return (
    "server_" +
    encodeURIComponent(props.server.name || (route.params["server"] as string))
  );
}

/**
 * Listens to a channel named according to the {@link Server}'s name for updated information.
 */
onMounted(() => {
  socket.on(serverChannel(), (data: Record<string, unknown>) => {
    if (Object.prototype.hasOwnProperty.call(data, "message")) {
      const newMessages = Array.isArray(data["message"])
        ? data["message"]
        : [data["message"]];
      const liveMessages = newMessages as Record<string, unknown>[];
      if (messagesLoading) {
        bufferedMessages.push(...liveMessages);
      } else {
        appendMessages(liveMessages);
        checkEulaRequired();
      }
    }
    void nextTick(scrollConsole);
  });
  void getMessages();
});

/**
 * Unsubscribes the channel subscribed to in {@link onMounted}.
 */
onBeforeUnmount(() => {
  socket.off(serverChannel());
});

/**
 * Adds a date time message if necessary.
 * @param message the new message.
 * @param lastTimestamp the timestamp of the last message.
 */
function addDatetimeMessage(
  message: { _timestamp: number },
  lastTimestamp?: number,
) {
  const newDate = dayjs(message._timestamp);
  if (
    !lastTimestamp ||
    Math.floor(lastTimestamp / (24 * 60 * 60 * 1000)) <
      Math.floor(message._timestamp / (24 * 60 * 60 * 1000))
  ) {
    messages.value.push(
      new Message(
        MessageType.DateChange,
        newDate.format("YYYY-MM-DD"),
        message._timestamp,
      ),
    );
  }
}

function hasMessage(uuid: string): boolean {
  for (let index = 0; index < messages.value.length; index++) {
    if (messages.value[index]?.uuid === uuid) return true;
  }
  return false;
}

function appendMessages(newMessages: Record<string, unknown>[]) {
  newMessages.forEach((message) => {
    const messageData = message as {
      _timestamp: number;
      _uuid: string;
    };
    if (hasMessage(messageData._uuid)) return;
    const lastMessage = messages.value[messages.value.length - 1];
    addDatetimeMessage(messageData, lastMessage?.timestamp);
    messages.value.push(Object.assign(new Message(), message));
  });
}

/**
 * Emits `eula-required` if the latest message is the EULA refusal, so that a server which was
 * started again after accepting the EULA does not prompt for it anew.
 */
function checkEulaRequired(): void {
  const last = messages.value[messages.value.length - 1];
  if (
    last !== undefined &&
    /You need to agree to the EULA in order to run the server/i.test(last.text)
  ) {
    emit("eula-required");
  }
}

/**
 * Scrolls the console to last line.
 */
function scrollConsole() {
  scrollRequested = true;
  const el = consoleEnd.value;
  if (el instanceof HTMLElement && consoleRow.value) {
    const consoleElement = consoleRow.value.$el;
    if (scrolling) {
      return;
    }
    scrollRequested = false;
    if (
      el.offsetTop >=
      consoleElement.offsetTop + consoleElement.offsetHeight
    ) {
      consoleElement.scroll({
        top: el.offsetTop,
        behavior: "smooth",
      });
      checkScrollEnd(consoleElement);
      scrolling = true;
    }
  }
}

/**
 * Recursively checks if scrolling is finished for each frame and restarts scrolling afterwards if requested.
 * @param element the element (i.e. the console) for which it should be checked if scrolling is finished.
 * @param lastTop the value of `element.scrollTop` from the last iteration, compared with the current value to check if scrolling is still in progress. Defaults to -1.
 */
function checkScrollEnd(element: Element, lastTop = -1) {
  if (element.scrollTop === lastTop) {
    scrolling = false;
    if (scrollRequested) scrollConsole();
  } else {
    lastTop = element.scrollTop;
    window.requestAnimationFrame(() => checkScrollEnd(element, lastTop));
  }
}

/**
 * Fetches the latest 50 messages from the REST API.
 */
async function getMessages(): Promise<void> {
  const serverName = encodeURIComponent(
    props.server.name || (route.params["server"] as string),
  );
  let loadError: unknown;
  let failedToLoad = false;
  try {
    const data: Record<string, unknown>[] =
      await props.server.fetchMessages(serverName);
    appendMessages(data);
  } catch (error) {
    loadError = error;
    failedToLoad = true;
  } finally {
    messagesLoading = false;
    appendMessages(bufferedMessages);
    bufferedMessages = [];
    checkEulaRequired();
    if (failedToLoad) {
      messages.value.push(
        new Message(
          MessageType.Error,
          `Could not load server messages: ${
            loadError instanceof Error ? loadError.message : String(loadError)
          }`,
        ),
      );
    }
    void nextTick(scrollConsole);
  }
}

/**
 * Sends a server command from the console input to the server.
 */
async function sendCommand(): Promise<void> {
  try {
    const response = await props.server.sendCommand(command.value);
    if (!response.ok) {
      throw new Error(
        `Request failed (${response.status} ${response.statusText})`,
      );
    }
  } catch (error) {
    messages.value.push(
      new Message(
        MessageType.Error,
        `Could not send command: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );
  }
}
</script>

<style scoped>
.console-text {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.375rem;
}

.console-text :deep(input) {
  color: #fff;
}

.blockcluster-message {
  color: rgb(var(--v-theme-accent-lighten-2)) !important;
}
</style>

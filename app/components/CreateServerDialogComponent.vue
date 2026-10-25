<!--
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
  <v-dialog v-model="dialog" max-width="450px">
    <template #activator="{ props: activatorProps }">
      <v-btn
        variant="elevated"
        color="secondary"
        v-bind="activatorProps"
        @click="open"
      >
        <v-icon start :icon="mdiPlus" />
        {{ t("gui.views.home.create_server.button") }}
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        {{ t("gui.views.home.create_server.title") }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" density="compact" variant="tonal">
          {{ t("gui.views.home.create_server.error") }}
        </v-alert>
        <v-text-field
          v-model="name"
          variant="underlined"
          :label="t('gui.views.home.create_server.name')"
          :hint="t('gui.views.home.create_server.name_hint')"
          persistent-hint
          :disabled="creating"
          autofocus
        />
        <v-select
          v-model="version"
          variant="underlined"
          :items="versions"
          :label="t('gui.views.home.create_server.version')"
          :loading="loadingVersions"
          :disabled="loadingVersions || creating"
          :menu-props="{
            contentClass: 'v-menu__content menuable__content__active',
          }"
        />
        <v-text-field
          v-model="port"
          variant="underlined"
          type="number"
          :label="t('gui.views.home.create_server.port')"
          :hint="t('gui.views.home.create_server.port_hint')"
          persistent-hint
          :rules="[
            () => validPort || t('gui.views.home.create_server.port_invalid'),
          ]"
          :disabled="creating"
        />
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" :disabled="creating" @click="close">
          {{ t("gui.views.home.create_server.cancel") }}
        </v-btn>
        <v-btn
          variant="elevated"
          color="secondary"
          :disabled="
            !validName || !validPort || !version || loadingVersions || creating
          "
          :loading="creating"
          @click="create"
        >
          {{ t("gui.views.home.create_server.create") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiPlus } from "@mdi/js";

const emit = defineEmits<{ (e: "created"): void }>();

const { t } = useI18n();

const dialog = ref(false);
const versions = ref<string[]>([]);
const name = ref("");
const version = ref<string | null>(null);
const port = ref("");
const loadingVersions = ref(false);
const creating = ref(false);
const error = ref(false);

const validPort = computed<boolean>(() => {
  const trimmedPort = String(port.value).trim();
  if (trimmedPort === "") return true;
  return (
    /^\d+$/.test(trimmedPort) && +trimmedPort >= 1024 && +trimmedPort <= 65535
  );
});

const validName = computed<boolean>(() => {
  const trimmedName = name.value.trim();
  return (
    /^[A-Za-z0-9 _.-]{1,64}$/.test(trimmedName) &&
    trimmedName !== "." &&
    trimmedName !== ".."
  );
});

async function open(): Promise<void> {
  dialog.value = true;
  name.value = "";
  version.value = null;
  port.value = "";
  error.value = false;
  loadingVersions.value = true;
  try {
    const response = await fetch("/api/paper/versions");
    if (!response.ok) throw new Error("Could not load Paper versions");
    versions.value = await response.json();
  } catch {
    error.value = true;
  } finally {
    loadingVersions.value = false;
  }
}

async function create(): Promise<void> {
  const trimmedName = name.value.trim();
  if (
    !validName.value ||
    !validPort.value ||
    !version.value ||
    loadingVersions.value ||
    creating.value
  )
    return;
  error.value = false;
  creating.value = true;
  try {
    const response = await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmedName,
        version: version.value,
        ...(String(port.value).trim() !== "" && { port: +port.value }),
      }),
    });
    if (!response.ok) throw new Error("Could not create Paper server");
    emit("created");
    close();
  } catch {
    error.value = true;
  } finally {
    creating.value = false;
  }
}

function close(): void {
  dialog.value = false;
}
</script>

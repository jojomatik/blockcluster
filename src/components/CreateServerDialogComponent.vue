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
    <template v-slot:activator="{ on, attrs }">
      <v-btn color="secondary" v-bind="attrs" v-on="on" @click="open">
        <v-icon left>mdi-plus</v-icon>
        {{ $t("gui.views.home.create_server.button") }}
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        {{ $t("gui.views.home.create_server.title") }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" dense text>
          {{ $t("gui.views.home.create_server.error") }}
        </v-alert>
        <v-text-field
          v-model="name"
          :label="$t('gui.views.home.create_server.name')"
          :hint="$t('gui.views.home.create_server.name_hint')"
          persistent-hint
          :disabled="creating"
          autofocus
        />
        <v-select
          v-model="version"
          :items="versions"
          :label="$t('gui.views.home.create_server.version')"
          :loading="loadingVersions"
          :disabled="loadingVersions || creating"
        />
        <v-text-field
          v-model="port"
          type="number"
          :label="$t('gui.views.home.create_server.port')"
          :hint="$t('gui.views.home.create_server.port_hint')"
          persistent-hint
          :rules="[
            () => validPort || $t('gui.views.home.create_server.port_invalid'),
          ]"
          :disabled="creating"
        />
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text :disabled="creating" @click="close">
          {{ $t("gui.views.home.create_server.cancel") }}
        </v-btn>
        <v-btn
          color="secondary"
          :disabled="
            !validName || !validPort || !version || loadingVersions || creating
          "
          :loading="creating"
          @click="create"
        >
          {{ $t("gui.views.home.create_server.create") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class CreateServerDialogComponent extends Vue {
  private dialog = false;
  private versions: string[] = [];
  private name = "";
  private version: string | null = null;
  private port = "";
  private loadingVersions = false;
  private creating = false;
  private error = false;

  private get validPort(): boolean {
    const port = String(this.port).trim();
    if (port === "") return true;
    return /^\d+$/.test(port) && +port >= 1024 && +port <= 65535;
  }

  private get validName(): boolean {
    const name = this.name.trim();
    return (
      /^[A-Za-z0-9 _.-]{1,64}$/.test(name) && name !== "." && name !== ".."
    );
  }

  private async open(): Promise<void> {
    this.dialog = true;
    this.name = "";
    this.version = null;
    this.port = "";
    this.error = false;
    this.loadingVersions = true;
    try {
      const response = await fetch("/api/paper/versions");
      if (!response.ok) throw new Error("Could not load Paper versions");
      this.versions = await response.json();
    } catch (error) {
      this.error = true;
    } finally {
      this.loadingVersions = false;
    }
  }

  private async create(): Promise<void> {
    const name = this.name.trim();
    if (
      !this.validName ||
      !this.validPort ||
      !this.version ||
      this.loadingVersions ||
      this.creating
    )
      return;
    this.error = false;
    this.creating = true;
    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          version: this.version,
          ...(String(this.port).trim() !== "" && { port: +this.port }),
        }),
      });
      if (!response.ok) throw new Error("Could not create Paper server");
      this.$emit("created");
      this.close();
    } catch (error) {
      this.error = true;
    } finally {
      this.creating = false;
    }
  }

  private close(): void {
    this.dialog = false;
  }
}
</script>

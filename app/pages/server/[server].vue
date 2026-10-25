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

<script setup lang="ts">
import ServerComponent from "@/components/ServerComponent.vue";
import Server from "@/lib/components/server";

/**
 * A view that shows one server.
 */
const server = reactive(new Server({}));

useHead({ title: () => server.name });
</script>

<template>
  <div class="server">
    <ServerComponent :detailed="true" :server="server" />
  </div>
</template>

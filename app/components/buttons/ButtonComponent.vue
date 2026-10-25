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
  <v-btn :color="color" :disabled="disabled" variant="text" @click="clicked">
    <v-icon start :icon="icon" />
    <slot></slot>
  </v-btn>
</template>

<script setup lang="ts">
/**
 * A customizable button component.
 */
withDefaults(
  defineProps<{
    /**
     * The color of this {@link ButtonComponent} Button.
     */
    color?: string;

    /**
     * The icon (an svg path) of this {@link ButtonComponent} Button.
     */
    icon?: string;

    /**
     * Whether the button should be disabled.
     */
    disabled?: boolean;
  }>(),
  { color: "primary", icon: "", disabled: false },
);

const emit = defineEmits<{ (e: "click"): void }>();

/**
 * Emits an event `click`.
 */
function clicked() {
  emit("click");
}
</script>

<style scoped></style>

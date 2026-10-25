/*
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
*/
import { shallowMount } from "@vue/test-utils";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

describe("ButtonComponent", () => {
  it("renders its slot content and emits click", async () => {
    const wrapper = shallowMount(ButtonComponent, {
      props: {
        color: "primary",
        icon: "mdi-check",
      },
      slots: {
        default: "Save",
      },
      global: {
        stubs: {
          "v-btn": {
            name: "VBtn",
            props: ["color", "disabled"],
            template:
              '<button @click="$emit($event.type, $event)"><slot /></button>',
          },
          "v-icon": {
            name: "VIcon",
            props: ["icon"],
            template: "<i>{{ icon }}<slot /></i>",
          },
        },
      },
    });
    const button = wrapper.findComponent({ name: "VBtn" });

    expect(button.exists()).toBe(true);
    expect(button.text()).toContain("Save");
    expect(button.props("color")).toBe("primary");
    expect(wrapper.findComponent({ name: "VIcon" }).text()).toBe("mdi-check");

    await button.trigger("click");

    expect(wrapper.emitted("click")).toHaveLength(1);
    wrapper.unmount();
  });
});

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
import { ServerStatus } from "../../../../common/components/server";
import ToggleButtonComponent from "../../../../src/components/buttons/ToggleButtonComponent.vue";

describe("ToggleButtonComponent", () => {
  it("emits start when clicked while stopped", () => {
    const wrapper = shallowMount(ToggleButtonComponent, {
      propsData: { status: ServerStatus.Stopped },
      mocks: { $t: (key: string) => key },
    });

    wrapper.findComponent({ name: "ButtonComponent" }).vm.$emit("click");

    expect(wrapper.emitted("start")).toHaveLength(1);
    expect(
      wrapper.findComponent({ name: "ButtonComponent" }).props("disabled")
    ).toBe(false);
    wrapper.destroy();
  });

  it("emits stop when clicked while started", () => {
    const wrapper = shallowMount(ToggleButtonComponent, {
      propsData: { status: ServerStatus.Started },
      mocks: { $t: (key: string) => key },
    });

    wrapper.findComponent({ name: "ButtonComponent" }).vm.$emit("click");

    expect(wrapper.emitted("stop")).toHaveLength(1);
    wrapper.destroy();
  });
});

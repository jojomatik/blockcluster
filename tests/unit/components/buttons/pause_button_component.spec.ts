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
import { ServerStatus } from "#shared/components/server";
import PauseButtonComponent from "@/components/buttons/PauseButtonComponent.vue";

describe("PauseButtonComponent", () => {
  it.each([
    { status: ServerStatus.Started, action: "pause" },
    { status: ServerStatus.Paused, action: "unpause" },
  ])("emits $action when the server is $status", ({ status, action }) => {
    const wrapper = shallowMount(PauseButtonComponent, {
      props: { status },
    });

    wrapper.findComponent({ name: "ButtonComponent" }).vm.$emit("click");

    expect(wrapper.emitted(action)).toHaveLength(1);
    wrapper.unmount();
  });

  it("disables pausing when the server is stopped", () => {
    const wrapper = shallowMount(PauseButtonComponent, {
      props: { status: ServerStatus.Stopped },
    });

    expect(
      wrapper.findComponent({ name: "ButtonComponent" }).props("disabled"),
    ).toBe(true);
    wrapper.unmount();
  });
});

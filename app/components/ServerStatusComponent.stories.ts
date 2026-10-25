import ServerStatusComponent from "@/components/ServerStatusComponent.vue";
import { ServerStatus } from "#shared/components/server";
import prepareEnum from "../../.storybook/enumPrepare";

export default {
  title: "Atoms/ServerStatusComponent",
  component: ServerStatusComponent,
  argTypes: {
    status: { control: "select", options: prepareEnum(ServerStatus) },
  },
  args: { status: ServerStatus.Started },
};

export const Default = {};

export const AllStatuses = {
  render: () => ({
    components: { ServerStatusComponent },
    data: () => ({ statuses: Object.values(prepareEnum(ServerStatus)) }),
    template: `<div><ServerStatusComponent v-for="s in statuses" :key="s" :status="s" /></div>`,
  }),
};

import RestartButtonComponent from "@/components/buttons/RestartButtonComponent.vue";
import { ServerStatus } from "../../../common/components/server";
import prepareEnum from "../../../.storybook/enumPrepare";

export default {
  component: RestartButtonComponent,
  argTypes: {
    status: {
      control: "select",
      options: prepareEnum(ServerStatus),
    },
    restart: { action: "clicked" },
  },
};

export const Default = {
  args: {
    disabled: false,
    status: ServerStatus.Started,
  },
};

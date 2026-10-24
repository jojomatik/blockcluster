import PlayerStatsComponent from "@/components/PlayerStatsComponent.vue";

const jojomatikHead =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsSAAALEgHS3X78AAAA+ElEQVQYlR3JzUvCYACA8fefCyKs7OKgD7oF1bFTEAQimhGVRXRZxJY1FGOQs3RQZAeLIjqkESgbUSB9rMQ1Nip4wh2ey/MTbX2ShiLxehjDUgZoaWPYuQnu5QjPWhRhZ6NYmkRTHaF1MMqDKmFnh3jKj2Opg4iXfAzHzPBWTOEYSdzTDfyzdb4ryzSVYcTvxRZBEBCfy8FjEeoF5qf3IHD5NDOIn+om3rXGX8MIMexmF7e6jVNeRXTMNd7PZa5mI3C3D3Wd25l+gkqKzvES4uMowVcpjV+TuZzqC/NrO+HrmWgXFnD0RbpGHO8kiVdO0zVXcEoJevYPlgLGCbqeWAwAAAAASUVORK5CYII=";

const itspolderHead =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAACXBIWXMAAAsSAAALEgHS3X78AAAAmUlEQVQYlWPI9TD6n+qs/x9El/ia/U+w0/kfa6sN5oNohmIfU7Bgor3ufxAbRsPYDCBJGOfDvjlgDGLDMEOYpcb/7xc2/P96Yx+Y/nx4EZztbaj8n+Hjvjn/v768/T/UQv3/j5v7/38+uADMBomB5FAU/Hx48v+7Lf2oCt5u6AEzPh+cDzYWhkFiIDmGZzOLwAyQADIGiYHkAMEjq+CVYnJuAAAAAElFTkSuQmCC";

export default {
  title: "Components/PlayerStatsComponent",
  component: PlayerStatsComponent,
  argTypes: { width: { control: { type: "range", min: 16, max: 64 } } },
};

export const Default = {
  args: {
    playerStats: {
      online: 2,
      max: 20,
      sample: [
        {
          uuid: "852da943-b45c-45aa-8cbd-22d8e9b38473",
          name: "Jojomatik",
          head: jojomatikHead,
        },
        {
          uuid: "e2a74186-be9d-42e5-a254-c40150404557",
          name: "ItsPolder",
          head: itspolderHead,
        },
      ],
    },
  },
};

export const Empty = {
  args: { playerStats: { online: 0, max: 20, sample: [] } },
};

export const Small = {
  args: { ...Default.args, width: 24 },
};

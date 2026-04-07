import type { Preview } from "@storybook/react-vite";

import "../src/styles.css";

const preview: Preview = {
  parameters: {
    a11y: {
      test: "error",
    },
    backgrounds: {
      default: "paper",
      values: [
        {
          name: "paper",
          value: "var(--color-bg-base)",
        },
        {
          name: "ink",
          value: "#17181d",
        },
      ],
    },
    controls: {
      expanded: true,
    },
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default preview;

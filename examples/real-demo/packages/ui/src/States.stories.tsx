import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card, EmptyState, Spinner, Tag } from "./index";

const meta = {
  title: "Primitives/States",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SurfaceSet: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gap: "var(--space-4)",
        width: "min(640px, 100%)",
      }}
    >
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Spinner label="Loading card preview" />
          <div>
            <strong>Background refresh</strong>
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
              Demonstrates the shared surface, tag, and spinner primitives together.
            </p>
          </div>
          <Tag>Live</Tag>
        </div>
      </Card>
      <Card>
        <EmptyState
          description="This state component is ready for empty collections and first-run onboarding."
          title="No activity yet"
        />
      </Card>
    </div>
  ),
};

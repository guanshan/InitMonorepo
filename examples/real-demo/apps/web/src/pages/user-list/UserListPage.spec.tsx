import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { UserListPage } from "./UserListPage";

describe("UserListPage", () => {
  it("renders users returned by the SDK-backed query", async () => {
    server.use(
      http.get("*/api/users", () =>
        HttpResponse.json({
          data: [
            {
              createdAt: "2026-04-06T00:00:00.000Z",
              email: "ada@example.com",
              id: "user_1",
              name: "Ada Lovelace",
              role: "ADMIN",
              updatedAt: "2026-04-06T00:00:00.000Z",
            },
          ],
          meta: {
            cached: false,
            requestId: "req_test_users",
            timestamp: "2026-04-07T00:00:00.000Z",
          },
          success: true,
        }),
      ),
    );

    renderWithProviders(<UserListPage />, {
      route: "/users",
    });

    expect(screen.getByRole("heading", { name: "Fetching users" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
      "href",
      "/users/user_1",
    );
  });
});

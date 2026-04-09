import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { UserListPage } from "./UserListPage";

describe("UserListPage", () => {
  it("renders users returned by the SDK-backed query", async () => {
    server.use(
      http.get("*/api/v1/users", () =>
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
          pagination: {
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1,
          },
          success: true,
        }),
      ),
    );

    renderWithProviders(<UserListPage />, {
      route: "/users",
    });

    expect(
      screen.getByRole("heading", { name: "Fetching users" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Ada Lovelace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
      "href",
      "/users/user_1",
    );
    expect(screen.getByText("Showing 1-1 of 1 users")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("requests the page from the URL and exposes pagination controls", async () => {
    server.use(
      http.get("*/api/v1/users", ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");

        if (page === "2") {
          return HttpResponse.json({
            data: [
              {
                createdAt: "2026-04-08T00:00:00.000Z",
                email: "grace@example.com",
                id: "user_2",
                name: "Grace Hopper",
                role: "SUPPORT",
                updatedAt: "2026-04-08T00:00:00.000Z",
              },
            ],
            meta: {
              cached: false,
              requestId: "req_test_users_page_2",
              timestamp: "2026-04-08T00:00:00.000Z",
            },
            pagination: {
              page: 2,
              pageSize: 1,
              totalItems: 2,
              totalPages: 2,
            },
            success: true,
          });
        }

        return HttpResponse.json({
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
            requestId: "req_test_users_page_1",
            timestamp: "2026-04-07T00:00:00.000Z",
          },
          pagination: {
            page: 1,
            pageSize: 1,
            totalItems: 2,
            totalPages: 2,
          },
          success: true,
        });
      }),
    );

    renderWithProviders(<UserListPage />, {
      route: "/users?page=2",
    });

    expect(
      await screen.findByRole("heading", { name: "Grace Hopper" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Showing 2-2 of 2 users")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});

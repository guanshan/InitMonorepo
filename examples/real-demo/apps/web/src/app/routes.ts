import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("users", "routes/user-list.tsx"),
  route("users/new", "routes/user-create.tsx"),
  route("users/:userId", "routes/user-detail.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;

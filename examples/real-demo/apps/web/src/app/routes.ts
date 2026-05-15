import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("users", "routes/users.tsx"),
  route("settings", "routes/settings.tsx"),
  route("providers", "routes/providers.tsx"),
  route("models", "routes/models.tsx"),
  route("playground", "routes/playground.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;

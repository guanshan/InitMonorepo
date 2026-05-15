import { environment } from "../shared/config/env";

const withAppName = (title: string) => `${title} | ${environment.appName}`;

export const routeMetaCopy = {
  home: {
    description:
      "A signed-in landing page that surfaces the current session user — proof that auth, cookies, and the SDK pipeline all line up.",
    title: "Home",
  },
  login: {
    description:
      "Sign in to the demo with the seeded dev accounts or any credentials managed by the auth module.",
    title: "Sign in",
  },
  notFound: {
    description: "The page you requested does not exist.",
    title: "Page not found",
  },
  users: {
    description:
      "Manage the people who can sign in to the demo: invite new users, adjust roles, and reset credentials.",
    title: "Users",
  },
  settings: {
    description:
      "Tune basic system preferences: branding, default theme, session limits, and broadcasted announcements.",
    title: "Settings",
  },
  providers: {
    description:
      "Manage the upstream LLM providers and their credentials.",
    title: "Providers",
  },
  models: {
    description:
      "Register, verify, and govern the LLM endpoints powering the workspace.",
    title: "Model management",
  },
  playground: {
    description:
      "Send prompts to any registered model and inspect responses side by side.",
    title: "Model playground",
  },
} as const;

export const defaultMeta = () => [
  { title: environment.appName },
  {
    content: routeMetaCopy.home.description,
    name: "description",
  },
];

interface RouteMetaInput {
  description?: string;
  title: string;
}

export const buildRouteMeta = ({ description, title }: RouteMetaInput) => [
  {
    title: withAppName(title),
  },
  ...(description
    ? [
        {
          content: description,
          name: "description",
        },
      ]
    : []),
];

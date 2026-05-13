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

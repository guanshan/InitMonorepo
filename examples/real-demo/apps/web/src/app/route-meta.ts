import { environment } from "../shared/config/env";

const withAppName = (title: string) => `${title} | ${environment.appName}`;

export const routeMetaCopy = {
  home: {
    description:
      "An English-only demo application that exercises a generated SDK, a NestJS API, Prisma persistence, Redis caching, and a monorepo package graph.",
    title: "Home",
  },
  notFound: {
    description: "The page you requested does not exist.",
    title: "Page not found",
  },
  userCreate: {
    description: "Submit the form below to test the full front-to-back flow.",
    title: "Create a new user",
  },
  userDetail: {
    description: "Inspect a single user record from the generated SDK flow.",
    title: "User detail",
  },
  users: {
    description: "Browse the current directory of users from the generated SDK.",
    title: "Users",
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

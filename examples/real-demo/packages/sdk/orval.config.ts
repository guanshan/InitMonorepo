import { defineConfig } from "orval";

export default defineConfig({
  sdk: {
    input: "../../apps/server/openapi/openapi.json",
    output: {
      target: "./src/generated/client.ts",
      schemas: "./src/generated/model",
      client: "fetch",
      mode: "single",
      clean: true,
      override: {
        mutator: {
          path: "./src/runtime/fetcher.ts",
          name: "customFetcher",
        },
      },
    },
  },
  "sdk-react": {
    input: "../../apps/server/openapi/openapi.json",
    output: {
      target: "./src/generated/hooks.ts",
      schemas: "./src/generated/model",
      client: "react-query",
      mode: "single",
      clean: false,
      override: {
        mutator: {
          path: "./src/runtime/fetcher.ts",
          name: "customFetcher",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});

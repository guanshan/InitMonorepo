import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "packages/sdk/src/generated/**",
      "packages/sdk/openapi.json",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: false,
        },
      ],
    },
  },
  // ---------- Boundary enforcement (FSD layers + package boundaries) ----------
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "apps/web/src/app/**" },
        { type: "pages", pattern: "apps/web/src/pages/**" },
        { type: "widgets", pattern: "apps/web/src/widgets/**" },
        { type: "features", pattern: "apps/web/src/features/**" },
        { type: "entities", pattern: "apps/web/src/entities/**" },
        { type: "shared", pattern: "apps/web/src/shared/**" },
        { type: "styles", pattern: "apps/web/src/styles/**" },
        { type: "locales", pattern: "apps/web/src/locales/**" },
        { type: "test", pattern: "apps/web/src/test/**" },
      ],
      "boundaries/ignore": ["**/*.spec.*", "**/*.test.*"],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // app can import everything
            {
              from: "app",
              allow: [
                "app",
                "pages",
                "widgets",
                "features",
                "entities",
                "shared",
                "styles",
                "locales",
              ],
            },
            // pages can import widgets, features, entities, shared
            {
              from: "pages",
              allow: ["pages", "widgets", "features", "entities", "shared"],
            },
            // widgets can import features, entities, shared
            {
              from: "widgets",
              allow: ["widgets", "features", "entities", "shared"],
            },
            // features can import entities, shared
            {
              from: "features",
              allow: ["features", "entities", "shared"],
            },
            // entities can import shared only
            {
              from: "entities",
              allow: ["entities", "shared"],
            },
            // shared can only import shared
            {
              from: "shared",
              allow: ["shared"],
            },
            // styles/locales/test are leaf layers
            { from: "styles", allow: ["styles"] },
            { from: "locales", allow: ["locales"] },
            { from: "test", allow: ["test", "shared", "entities"] },
          ],
        },
      ],
    },
  },
  // ---------- Package boundary: server must not import sdk or ui ----------
  {
    files: ["apps/server/src/**/*.{ts,tsx}"],
    plugins: {
      boundaries,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@real-demo/sdk", "@real-demo/sdk/*", "@real-demo/ui", "@real-demo/ui/*"],
              message:
                "Server must not depend on @real-demo/sdk or @real-demo/ui. See docs/dependency-boundaries.md.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/modules/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/application/**",
                "**/infrastructure/**",
                "**/interfaces/**",
                "@nestjs/*",
                "@prisma/client",
                "nestjs-zod",
              ],
              message:
                "Domain files must stay framework-agnostic and may not depend on application, infrastructure, or interface layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/modules/*/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "**/interfaces/**", "@prisma/client"],
              message:
                "Application files must depend on ports and domain contracts, not concrete infrastructure or interface details.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/modules/*/interfaces/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "@prisma/client"],
              message:
                "Interface files should talk to application use cases instead of concrete infrastructure details.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/modules/*/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/interfaces/**"],
              message:
                "Infrastructure files must not depend on interface details.",
            },
          ],
        },
      ],
    },
  },
];

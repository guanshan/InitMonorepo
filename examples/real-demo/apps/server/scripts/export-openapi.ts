import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { cleanupOpenApiDoc } from "nestjs-zod";

import { createApp, createOpenApiDocument } from "../src/app.factory";

// Zod 4 emits OpenAPI 3.1-style `const` for literal types, but our doc is
// declared as 3.0.0 (and orval validates against 3.0). Rewrite `const: X` to
// `enum: [X]` so generators that only understand 3.0 keep working.
const downgradeConstToEnum = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(downgradeConstToEnum);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, child]) => [key, downgradeConstToEnum(child)] as const,
    );
    const result: Record<string, unknown> = Object.fromEntries(entries);
    if ("const" in result) {
      result.enum = [result.const];
      delete result.const;
    }
    return result;
  }
  return value;
};

const run = async () => {
  const app = await createApp();
  const document = downgradeConstToEnum(
    cleanupOpenApiDoc(createOpenApiDocument(app)),
  );
  const targetPath = resolve(process.cwd(), "openapi/openapi.json");

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await app.close();
};

run().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});

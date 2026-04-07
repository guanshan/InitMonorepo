import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { cleanupOpenApiDoc } from "nestjs-zod";

import { createApp, createOpenApiDocument } from "../src/app.factory";

const run = async () => {
  const app = await createApp();
  const document = cleanupOpenApiDoc(createOpenApiDocument(app));
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

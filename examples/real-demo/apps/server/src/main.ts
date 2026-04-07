import "dotenv/config";

import { createApp } from "./app.factory";
import { loadEnvironment } from "./common/config/env";

async function bootstrap() {
  const environment = loadEnvironment();
  const app = await createApp();

  await app.listen(environment.port);
}

bootstrap();

import { createFactory } from "hono/factory";

import { appEnvVariables } from "server/env.ts";
import { type AppEnvVariables } from "server/zod/env.ts";

export type Variables = Record<string, unknown> & AppEnvVariables;

export const factory = createFactory<{ Variables: Variables }>({
  initApp: (app) => {
    app.use(async (c, next) => {
      for (const [key, value] of Object.entries(appEnvVariables)) {
        c.set(key as keyof AppEnvVariables, value);
      }
      await next();
    });
  },
});

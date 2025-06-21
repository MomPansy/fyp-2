import { createFactory } from "hono/factory";
import { appEnvVariables } from "./env.js";
const factory = createFactory({
  initApp: (app) => {
    app.use(async (c, next) => {
      for (const [key, value] of Object.entries(appEnvVariables)) {
        c.set(key, value);
      }
      await next();
    });
  }
});
export {
  factory
};

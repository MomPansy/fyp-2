import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { factory } from "./factory.js";
const app = factory.createApp();
const apiRoutes = app.basePath("/api");
app.get("/healthz", (c) => {
  return c.json({ message: "Ok" });
});
app.get("/*", serveStatic({ root: "./dist/static" })).get("/*", serveStatic({ path: "./dist/static/index.html" }));
(async () => {
  const port = 3e3;
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server is running on port ${port.toString()}`);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
export {
  apiRoutes
};

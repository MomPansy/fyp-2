import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { factory } from "./factory.ts";
import { route as exampleRoute } from "./routes/example.ts";

const app = factory.createApp();

app.get('/healthz', (c) => {
  return c.json({ message: 'Ok' });
});

export const apiRoutes = app
  .basePath('/api')
  .route('/example', exampleRoute)

export type ApiRoutes = typeof apiRoutes;

app
  .get('/*', serveStatic({ root: './dist/static' }))
  .get('/*', serveStatic({ path: './dist/static/index.html' }));

(async () => {

  const port = 3000;
  serve({ fetch: app.fetch, port }, () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on port ${port.toString()}`);
  });
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
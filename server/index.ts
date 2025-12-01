import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { factory } from "./factory.ts";
import { route as authRoute } from "./routes/auth/index.ts";
import { route as exampleRoute } from "./routes/example.ts";
import { route as problemsRoute } from "./routes/problems/index.ts";
import { route as pythonRoute } from "./routes/python/index.ts";
import emailRoute from "./routes/email/index.ts";
import { route as invitationsRoute } from "./routes/invitations/index.ts";
import { route as studentAssessmentsRoute } from "./routes/student-assessments/index.ts";
import { route as submissionsRoute } from "./routes/submissions/index.ts";

const app = factory.createApp();

app.use(logger());

app.get("/healthz", (c) => {
  return c.json({ message: "Ok" });
});

export const apiRoutes = app
  .basePath("/api")
  .route("/auth", authRoute)
  .route("/example", exampleRoute)
  .route("/problems", problemsRoute)
  .route("/python", pythonRoute)
  .route("/email", emailRoute)
  .route("/invitations", invitationsRoute)
  .route("/student/assessments", studentAssessmentsRoute)
  .route("/submissions", submissionsRoute);

export type ApiRoutes = typeof apiRoutes;

app
  .get("/*", serveStatic({ root: "./dist/static" }))
  .get("/*", serveStatic({ path: "./dist/static/index.html" }));

// eslint-disable-next-line @typescript-eslint/require-await
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

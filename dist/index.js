import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { factory } from "./factory.js";
import { route as authRoute } from "./routes/auth/index.js";
import { route as exampleRoute } from "./routes/example.js";
import { route as problemsRoute } from "./routes/problems/index.js";
import { route as pythonRoute } from "./routes/python/index.js";
import emailRoute from "./routes/email/index.js";
import { route as invitationsRoute } from "./routes/invitations/index.js";
import { route as studentAssessmentsRoute } from "./routes/student-assessments/index.js";
const app = factory.createApp();
app.use(logger());
app.get("/healthz", (c) => {
  return c.json({ message: "Ok" });
});
const apiRoutes = app.basePath("/api").route("/auth", authRoute).route("/example", exampleRoute).route("/problems", problemsRoute).route("/python", pythonRoute).route("/email", emailRoute).route("/invitations", invitationsRoute).route("/student/assessments", studentAssessmentsRoute);
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

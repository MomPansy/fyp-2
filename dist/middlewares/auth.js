import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { appEnvVariables } from "../env.js";
import { jwtPayloadSchema } from "../zod/jwt.js";
const { SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET } = appEnvVariables;
function auth({ requireServiceRole = false } = {}) {
  return createMiddleware(async (c, next) => {
    const apiKey = c.req.header("apikey");
    if (!apiKey || apiKey !== SUPABASE_ANON_KEY) {
      throw new HTTPException(401, {
        res: Response.json({ error: "unauthorized" }, { status: 401 })
      });
    }
    const jwtToken = c.req.header("authorization")?.replace("Bearer ", "");
    if (!jwtToken) {
      throw new HTTPException(401, {
        res: Response.json({ error: "unauthorized" }, { status: 401 })
      });
    }
    let jwtPayload;
    try {
      jwtPayload = jwtPayloadSchema.parse(
        await verify(jwtToken, SUPABASE_JWT_SECRET)
      );
    } catch (error) {
      console.error(error);
      throw new HTTPException(401, {
        res: Response.json({ error: "unauthorized" }, { status: 401 })
      });
    }
    if (requireServiceRole && jwtPayload.role !== "service_role") {
      throw new HTTPException(401, {
        res: Response.json({ error: "unauthorized" }, { status: 401 })
      });
    }
    c.set("jwtPayload", jwtPayload);
    await next();
  });
}
export {
  auth
};

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { appEnvVariables } from "../env.js";
import { jwtPayloadSchema } from "../zod/jwt.js";
const { SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET } = appEnvVariables;
function auth({ requireServiceRole = false } = {}) {
  return createMiddleware(async (c, next) => {
    const apiKey = c.req.header("apikey");
    if (!apiKey) {
      throw new HTTPException(401, {
        res: Response.json({
          error: "Missing API key",
          message: "API key is required in the 'apikey' header"
        }, { status: 401 })
      });
    }
    if (apiKey !== SUPABASE_ANON_KEY) {
      throw new HTTPException(401, {
        res: Response.json({
          error: "Invalid API key",
          message: "The provided API key is not valid"
        }, { status: 401 })
      });
    }
    const authHeader = c.req.header("authorization");
    if (!authHeader) {
      throw new HTTPException(401, {
        res: Response.json({
          error: "Missing authorization header",
          message: "Authorization header is required"
        }, { status: 401 })
      });
    }
    const jwtToken = authHeader.replace("Bearer ", "");
    if (!jwtToken || jwtToken === authHeader) {
      throw new HTTPException(401, {
        res: Response.json({
          error: "Invalid authorization format",
          message: "Authorization header must be in format 'Bearer <token>'"
        }, { status: 401 })
      });
    }
    let jwtPayload;
    try {
      const verifiedPayload = await verify(jwtToken, SUPABASE_JWT_SECRET);
      jwtPayload = jwtPayloadSchema.parse(verifiedPayload);
    } catch (error) {
      console.error("JWT verification/parsing error:", error);
      if (error instanceof Error) {
        if (error.message.includes("signature")) {
          throw new HTTPException(401, {
            res: Response.json({
              error: "Invalid token signature",
              message: "The JWT token signature is invalid"
            }, { status: 401 })
          });
        }
        if (error.message.includes("expired")) {
          throw new HTTPException(401, {
            res: Response.json({
              error: "Token expired",
              message: "The JWT token has expired"
            }, { status: 401 })
          });
        }
        if (error.message.includes("malformed")) {
          throw new HTTPException(401, {
            res: Response.json({
              error: "Malformed token",
              message: "The JWT token is malformed"
            }, { status: 401 })
          });
        }
      }
      throw new HTTPException(401, {
        res: Response.json({
          error: "Invalid token",
          message: "The JWT token is invalid or malformed"
        }, { status: 401 })
      });
    }
    if (requireServiceRole && jwtPayload.role !== "service_role") {
      throw new HTTPException(403, {
        res: Response.json({
          error: "Insufficient privileges",
          message: `Service role required but user has role: ${jwtPayload.role}`
        }, { status: 403 })
      });
    }
    c.set("jwtPayload", jwtPayload);
    await next();
  });
}
export {
  auth
};

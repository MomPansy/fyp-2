import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

import { appEnvVariables, type Variables as AppVariables } from "server/env.ts";
import { type JwtPayload, jwtPayloadSchema } from "server/zod/jwt.ts";

export type Variables = AppVariables & {
  jwtPayload?: JwtPayload;
};

const { SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET } = appEnvVariables;

interface Options {
  requireServiceRole?: boolean;
}

export function auth({ requireServiceRole = false }: Options = {}) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const apiKey = c.req.header("apikey");
    if (!apiKey) {
      throw new HTTPException(401, {
        res: Response.json(
          {
            error: "Missing API key",
            message: "API key is required in the 'apikey' header",
          },
          { status: 401 },
        ),
      });
    }

    if (apiKey !== SUPABASE_ANON_KEY) {
      throw new HTTPException(401, {
        res: Response.json(
          {
            error: "Invalid API key",
            message: "The provided API key is not valid",
          },
          { status: 401 },
        ),
      });
    }

    const authHeader = c.req.header("authorization");
    if (!authHeader) {
      throw new HTTPException(401, {
        res: Response.json(
          {
            error: "Missing authorization header",
            message: "Authorization header is required",
          },
          { status: 401 },
        ),
      });
    }

    const jwtToken = authHeader.replace("Bearer ", "");
    if (!jwtToken || jwtToken === authHeader) {
      throw new HTTPException(401, {
        res: Response.json(
          {
            error: "Invalid authorization format",
            message: "Authorization header must be in format 'Bearer <token>'",
          },
          { status: 401 },
        ),
      });
    }

    let jwtPayload: JwtPayload;
    try {
      const verifiedPayload = await verify(jwtToken, SUPABASE_JWT_SECRET);
      jwtPayload = jwtPayloadSchema.parse(verifiedPayload);
    } catch (error) {
      console.error("JWT verification/parsing error:", error);

      // Check if error is from JWT verification or Zod parsing
      if (error instanceof Error) {
        // JWT verification errors
        if (error.message.includes("signature")) {
          throw new HTTPException(401, {
            res: Response.json(
              {
                error: "Invalid token signature",
                message: "The JWT token signature is invalid",
              },
              { status: 401 },
            ),
          });
        }
        if (error.message.includes("expired")) {
          throw new HTTPException(401, {
            res: Response.json(
              {
                error: "Token expired",
                message: "The JWT token has expired",
              },
              { status: 401 },
            ),
          });
        }
        if (
          error.message.includes("malformed") ||
          error.message.includes("Invalid")
        ) {
          throw new HTTPException(401, {
            res: Response.json(
              {
                error: "Malformed token",
                message: "The JWT token is malformed or invalid",
              },
              { status: 401 },
            ),
          });
        }
        // Zod parsing errors (payload structure issues)
        if (error.name === "ZodError") {
          console.error("JWT payload validation failed:", error);
          throw new HTTPException(401, {
            res: Response.json(
              {
                error: "Invalid token payload",
                message:
                  "The JWT token payload does not match the expected structure",
              },
              { status: 401 },
            ),
          });
        }
      }

      // Generic JWT error with more detail
      throw new HTTPException(401, {
        res: Response.json(
          {
            error: "Token verification failed",
            message: `JWT verification failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
          { status: 401 },
        ),
      });
    }
    if (requireServiceRole && jwtPayload.role !== "service_role") {
      throw new HTTPException(403, {
        res: Response.json(
          {
            error: "Insufficient privileges",
            message: `Service role required but user has role: ${jwtPayload.role}`,
          },
          { status: 403 },
        ),
      });
    }

    c.set("jwtPayload", jwtPayload);
    await next();
  });
}

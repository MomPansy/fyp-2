import { sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import postgres from "postgres";
import { db } from "../lib/db.js";
function drizzle(options = {}) {
  return createMiddleware(
    async (c, next) => {
      const jwtPayload = c.get("jwtPayload");
      if (options.dangerouslyUseServiceRole === false) {
        if (!jwtPayload) {
          throw new Error(
            `'c.var.jwtPayload' is required (forgot the 'auth' middleware?)`
          );
        }
      }
      try {
        if (options.lazy) {
          const withTx = async (callback) => {
            return await db.transaction(async (tx) => {
              if (jwtPayload) {
                await tx.execute(
                  sql`select set_config('request.jwt.claims', ${JSON.stringify(jwtPayload)}, TRUE)`
                );
              }
              if (options.dangerouslyUseServiceRole === true) {
                await tx.execute(sql`set local role service_role`);
              } else {
                await tx.execute(sql`set local role authenticated`);
              }
              return await callback(tx);
            }, options.txConfig);
          };
          c.set("withTx", withTx);
          await next();
        } else {
          await db.transaction(async (tx) => {
            if (jwtPayload) {
              await tx.execute(
                sql`select set_config('request.jwt.claims', ${JSON.stringify(jwtPayload)}, TRUE)`
              );
            }
            if (options.dangerouslyUseServiceRole === true) {
              await tx.execute(sql`set local role service_role`);
            } else {
              await tx.execute(sql`set local role authenticated`);
            }
            c.set("tx", tx);
            await next();
          }, options.txConfig);
        }
      } catch (error) {
        if (error instanceof postgres.PostgresError) {
          if (error.code === "P0001" && error.message.startsWith("auth.")) {
            throw new HTTPException(401, {
              res: Response.json({ error: "unauthorized" }, { status: 401 })
            });
          }
          if (error.code === "42501") {
            throw new HTTPException(403, {
              res: Response.json({ error: "forbidden" }, { status: 403 })
            });
          }
        }
        throw error;
      }
    }
  );
}
export {
  drizzle
};

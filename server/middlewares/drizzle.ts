import { sql } from 'drizzle-orm';
import { type PgTransactionConfig } from 'drizzle-orm/pg-core';
import { type MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import postgres from 'postgres';

import { type Variables as AppVariables } from 'server/env.ts';
import { type Tx, type PostgresOptions, db } from 'server/lib/db.ts';

import { type Variables as AuthVariables } from './auth.ts';

export type Variables = AppVariables & AuthVariables;

export interface TxVariables extends Variables {
  tx: Tx;
}

export type WithTx = <T = void>(
  _callback: (_tx: Tx) => Promise<T>,
) => Promise<T>;
export interface WithTxVariables extends Variables {
  withTx: WithTx;
}

interface Options {
  postgres?: PostgresOptions;
  txConfig?: PgTransactionConfig;
  /**
   * Set to true if you want to use the `withTx` function instead of the `tx` variable from `c.get()`. Useful when you want to delay the creation of database transaction after some other time consuming tasks.
   * @default false
   */
  lazy?: boolean;
  /**
   * IMPORTANT: never use this option for endpoints that are exposed to the public without any other form of authentication. It bypasses Row Level Security policies: https://supabase.com/docs/guides/api/api-keys#the-servicerole-key
   * @default false
   */
  dangerouslyUseServiceRole?: boolean;
}

// @ts-expect-error: overload
export function drizzle(
  _options: Options & { lazy: true },
): MiddlewareHandler<{ Variables: WithTxVariables }>;

export function drizzle(
  _options?: Options | (Options & { lazy: false }),
): MiddlewareHandler<{ Variables: TxVariables }>;

export function drizzle(options: Options & { lazy?: boolean } = {}) {
  return createMiddleware<{ Variables: TxVariables | WithTxVariables }>(
    async (c, next) => {
      const jwtPayload = c.get('jwtPayload');
      if (options.dangerouslyUseServiceRole === false) {
        if (!jwtPayload) {
          throw new Error(
            `'c.var.jwtPayload' is required (forgot the 'auth' middleware?)`,
          );
        }
      }

      // Read more about Postgres RLS with drizzle:
      // https://github.com/drizzle-team/drizzle-orm/discussions/2450
      try {
        if (options.lazy) {
          const withTx: WithTx = async (callback) => {
            return await db.transaction(async (tx) => {
              if (jwtPayload) {
                await tx.execute(
                  sql`select set_config('request.jwt.claims', ${JSON.stringify(jwtPayload)}, TRUE)`,
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
          c.set('withTx', withTx);
          await next();
        } else {
          await db.transaction(async (tx) => {
            if (jwtPayload) {
              await tx.execute(
                sql`select set_config('request.jwt.claims', ${JSON.stringify(jwtPayload)}, TRUE)`,
              );
            }
            if (options.dangerouslyUseServiceRole === true) {
              await tx.execute(sql`set local role service_role`);
            } else {
              await tx.execute(sql`set local role authenticated`);
            }
            c.set('tx', tx);
            await next();
          }, options.txConfig);
        }
      } catch (error) {
        if (error instanceof postgres.PostgresError) {
          if (error.code === 'P0001' && error.message.startsWith('auth.')) {
            throw new HTTPException(401, {
              res: Response.json({ error: 'unauthorized' }, { status: 401 }),
            });
          }
          if (error.code === '42501') {
            throw new HTTPException(403, {
              res: Response.json({ error: 'forbidden' }, { status: 403 }),
            });
          }
        }
        throw error;
      }
    },
  );
}

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verify } from 'hono/jwt';

import { type Variables as AppVariables, appEnvVariables } from 'server/env.ts';
import { type JwtPayload, jwtPayloadSchema } from 'server/zod/jwt.ts';

export type Variables = AppVariables & {
  jwtPayload?: JwtPayload;
};

const { SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET } = appEnvVariables;

interface Options {
  requireServiceRole?: boolean;
}

export function auth({ requireServiceRole = false }: Options = {}) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const apiKey = c.req.header('apikey');
    if (!apiKey || apiKey !== SUPABASE_ANON_KEY) {
      throw new HTTPException(401, {
        res: Response.json({ error: 'unauthorized' }, { status: 401 }),
      });
    }
    const jwtToken = c.req.header('authorization')?.replace('Bearer ', '');
    if (!jwtToken) {
      throw new HTTPException(401, {
        res: Response.json({ error: 'unauthorized' }, { status: 401 }),
      });
    }

    let jwtPayload: JwtPayload;
    try {
      jwtPayload = jwtPayloadSchema.parse(
        await verify(jwtToken, SUPABASE_JWT_SECRET),
      );
    } catch (error) {
      console.error(error);
      throw new HTTPException(401, {
        res: Response.json({ error: 'unauthorized' }, { status: 401 }),
      });
    }

    if (requireServiceRole && jwtPayload.role !== 'service_role') {
      throw new HTTPException(401, {
        res: Response.json({ error: 'unauthorized' }, { status: 401 }),
      });
    }

    c.set('jwtPayload', jwtPayload);
    await next();
  });
}

import { appEnvVariablesSchema, type AppEnvVariables } from 'server/zod/env.ts';

export const appEnvVariables = appEnvVariablesSchema.parse(process.env);

export type Variables = Record<string, unknown> & AppEnvVariables;

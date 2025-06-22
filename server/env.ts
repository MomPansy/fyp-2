import { appEnvVariablesSchema, type AppEnvVariables } from "./zod/env.ts";

export const appEnvVariables = appEnvVariablesSchema.parse(process.env);

export type Variables = Record<string, unknown> & AppEnvVariables;

import { type AppEnvVariables, appEnvVariablesSchema } from "./zod/env.ts";

console.log(process.env);

export const appEnvVariables = appEnvVariablesSchema.parse(process.env);

export type Variables = Record<string, unknown> & AppEnvVariables;

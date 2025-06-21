import { appEnvVariablesSchema } from "./zod/env.js";
const appEnvVariables = appEnvVariablesSchema.parse(process.env);
export {
  appEnvVariables
};

import { appEnvVariables } from "server/env.ts";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import drizzleSchema from "server/drizzle/_index.ts";

const connectionString = appEnvVariables.DB_URL;
export const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema: drizzleSchema }); // insert your schema here

export type PostgresOptions = postgres.Options<
  Record<string, postgres.PostgresType>
>;

export type Tx = Parameters<
  Parameters<PostgresJsDatabase<typeof drizzleSchema>['transaction']>[0]
>[0];

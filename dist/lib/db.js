import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appEnvVariables } from "../env.js";
import drizzleSchema from "../drizzle/_index.js";
const connectionString = appEnvVariables.DB_URL;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema: drizzleSchema });
export {
  client,
  db
};

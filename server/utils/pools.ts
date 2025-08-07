import { Pool } from "pg";

export function newSandboxPool(dsn: string) {
  return new Pool({
    connectionString: dsn,
    max: 1,
    idleTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    statement_timeout: 10_000,
  });
}

import { Dialect } from "./mappings.ts";
import {
  createDatabasePool,
  type DatabasePool,
  type PostgresPool,
  type MysqlPool,
  type SqlitePool,
  type SqlServerPool,
  type OraclePool,
} from "server/problem-database/pools.ts";

// A simple in-memory store for connection pools
const poolStore = new Map<
  string,
  {
    pool: DatabasePool;
    dialect: Dialect;
  }
>();

/**
 * Creates and stores a new connection pool with explicit dialect.
 * @param key - A unique identifier for the pool (e.g., podName).
 * @param connectionString - The database connection string.
 * @param dialect - The database dialect to use.
 * @returns The newly created pool.
 */
export async function createPool(
  key: string,
  connectionString: string,
  dialect: Dialect,
): Promise<DatabasePool> {
  if (poolStore.has(key)) {
    // If a pool for this key already exists, close it before creating a new one.
    console.warn(`Pool with key "${key}" already exists. Closing old pool.`);
    const existing = poolStore.get(key);
    if (existing) {
      await closePoolByDialect(existing.pool, existing.dialect);
    }
  }

  const pool = await createDatabasePool(dialect, connectionString);
  poolStore.set(key, { pool, dialect });
  console.info(
    `✅ Connection pool created and stored for key: ${key} (dialect: ${dialect})`,
  );

  // Wait for the pool to be ready
  await waitForPoolReady(pool, dialect, key);

  return pool;
}

/**
 * Retrieves an existing connection pool.
 * @param key - The unique identifier for the pool.
 * @returns The pool if found, otherwise undefined.
 */
export function getPool(key: string): DatabasePool | undefined {
  return poolStore.get(key)?.pool;
}

/**
 * Retrieves the database dialect for a stored pool.
 * @param key - The unique identifier for the pool.
 * @returns The dialect if found, otherwise undefined.
 */
export function getPoolDialect(key: string): Dialect | undefined {
  return poolStore.get(key)?.dialect;
}

/**
 * Helper function to close a pool based on its dialect.
 * @param pool - The database pool to close.
 * @param dialect - The database dialect.
 */
async function closePoolByDialect(
  pool: DatabasePool,
  dialect: Dialect,
): Promise<void> {
  switch (dialect) {
    case "postgres":
    case "mysql":
    case "sqlite":
      await (pool as PostgresPool | MysqlPool | SqlitePool).end();
      break;
    case "sqlserver":
    case "oracle":
      await (pool as SqlServerPool | OraclePool).close();
      break;
    default:
      console.warn(`Unknown dialect for pool cleanup: ${dialect}`);
  }
}

/**
 * Waits for a database pool to be ready by testing connectivity.
 * @param pool - The database pool to test.
 * @param dialect - The database dialect.
 * @param key - The pool key for logging purposes.
 * @param maxRetries - Maximum number of retry attempts (default: 10).
 * @param retryDelay - Delay between retries in milliseconds (default: 500).
 */
async function waitForPoolReady(
  pool: DatabasePool,
  dialect: Dialect,
  key: string,
  maxRetries = 10,
  retryDelay = 500,
): Promise<void> {
  const testQuery = getTestQuery(dialect);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.info(
        `🔄 Testing database connectivity for pool "${key}" (attempt ${attempt}/${maxRetries})`,
      );

      await executeTestQuery(pool, dialect, testQuery);

      console.info(`✅ Database pool "${key}" is ready and responsive`);
      return;
    } catch (error) {
      console.warn(
        `❌ Database connectivity test failed for pool "${key}" (attempt ${attempt}/${maxRetries}):`,
        error,
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Database pool "${key}" failed to become ready after ${maxRetries} attempts. Last error: ${error}`,
        );
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

/**
 * Gets the appropriate test query for each database dialect.
 * @param dialect - The database dialect.
 * @returns The test query string.
 */
function getTestQuery(dialect: Dialect): string {
  switch (dialect) {
    case "postgres":
      return "SELECT 1";
    case "mysql":
      return "SELECT 1";
    case "sqlite":
      return "SELECT 1";
    case "sqlserver":
      return "SELECT 1";
    case "oracle":
      return "SELECT 1 FROM DUAL";
    default:
      return "SELECT 1";
  }
}

/**
 * Executes a test query against the database pool.
 * @param pool - The database pool.
 * @param dialect - The database dialect.
 * @param query - The test query to execute.
 */
async function executeTestQuery(
  pool: DatabasePool,
  dialect: Dialect,
  query: string,
): Promise<void> {
  switch (dialect) {
    case "postgres": {
      const pgPool = pool as PostgresPool;
      const client = await pgPool.connect();
      try {
        await client.query(query);
      } finally {
        client.release();
      }
      break;
    }
    case "mysql": {
      const mysqlPool = pool as MysqlPool;
      const connection = await mysqlPool.getConnection();
      try {
        await connection.execute(query);
      } finally {
        connection.release();
      }
      break;
    }
    case "sqlite": {
      const sqlitePool = pool as SqlitePool;
      await sqlitePool.query(query);
      break;
    }
    case "sqlserver": {
      const sqlServerPool = pool as SqlServerPool;
      const request = sqlServerPool.request();
      await request.query(query);
      break;
    }
    case "oracle": {
      const oraclePool = pool as OraclePool;
      const connection = await oraclePool.getConnection();
      try {
        await connection.execute(query);
      } finally {
        await connection.close();
      }
      break;
    }
    default:
      throw new Error(`Unsupported dialect for connectivity test: ${dialect}`);
  }
}

/**
 * Lists all active pool keys and their dialects.
 * @returns An array of objects containing key and dialect information.
 */
export function listActivePools(): { key: string; dialect: Dialect }[] {
  return Array.from(poolStore.entries()).map(([key, { dialect }]) => ({
    key,
    dialect,
  }));
}

/**
 * Checks if a pool exists for the given key.
 * @param key - The unique identifier for the pool.
 * @returns True if the pool exists, false otherwise.
 */
export function hasPool(key: string): boolean {
  return poolStore.has(key);
}

/**
 * Closes and removes all connection pools from the store.
 * Useful for application shutdown.
 */
export async function removeAllPools(): Promise<void> {
  const keys = Array.from(poolStore.keys());
  const promises = keys.map((key) => removePool(key));
  await Promise.all(promises);
  console.info("✅ All connection pools have been closed and removed.");
}

/**
 * Gets the total number of active pools.
 * @returns The number of active pools.
 */
export function getActivePoolCount(): number {
  return poolStore.size;
}

/**
 * Closes and removes a connection pool from the store.
 * @param key - The unique identifier for the pool.
 */
export async function removePool(key: string): Promise<void> {
  const entry = poolStore.get(key);
  if (entry) {
    await closePoolByDialect(entry.pool, entry.dialect);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    poolStore.delete(key);
    console.info(`✅ Connection pool closed and removed for key: ${key}`);
  } else {
    console.warn(`No pool found with key "${key}" to remove.`);
  }
}

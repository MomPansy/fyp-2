import { newSandboxPool } from "server/utils/pools.ts";
import type { Pool } from "pg";

// A simple in-memory store for connection pools
const poolStore = new Map<string, Pool>();

/**
 * Creates and stores a new connection pool.
 * @param key - A unique identifier for the pool (e.g., podName).
 * @param connectionString - The database connection string.
 * @returns The newly created pool.
 */
export function createPool(key: string, connectionString: string): Pool {
  if (poolStore.has(key)) {
    // If a pool for this key already exists, close it before creating a new one.
    console.warn(`Pool with key "${key}" already exists. Closing old pool.`);
    poolStore.get(key)?.end();
  }
  const pool = newSandboxPool(connectionString);
  poolStore.set(key, pool);
  console.info(`✅ Connection pool created and stored for key: ${key}`);
  return pool;
}

/**
 * Retrieves an existing connection pool.
 * @param key - The unique identifier for the pool.
 * @returns The pool if found, otherwise undefined.
 */
export function getPool(key: string): Pool | undefined {
  return poolStore.get(key);
}

/**
 * Closes and removes a connection pool from the store.
 * @param key - The unique identifier for the pool.
 */
export async function removePool(key: string): Promise<void> {
  const pool = poolStore.get(key);
  if (pool) {
    await pool.end();
    poolStore.delete(key);
    console.info(`✅ Connection pool closed and removed for key: ${key}`);
  } else {
    console.warn(`No pool found with key "${key}" to remove.`);
  }
}

import {
  createDatabasePool
} from "./pools.js";
const poolStore = /* @__PURE__ */ new Map();
async function createPool(key, connectionString, dialect) {
  if (poolStore.has(key)) {
    console.info(`Pool with key "${key}" already exists.`);
    const existing = poolStore.get(key);
    if (existing) {
      return existing.pool;
    }
  }
  const pool = await createDatabasePool(dialect, connectionString);
  poolStore.set(key, { pool, dialect });
  console.info(
    `\u2705 Connection pool created and stored for key: ${key} (dialect: ${dialect})`
  );
  await waitForPoolReady(pool, dialect, key);
  return pool;
}
async function getPool(key) {
  const entry = poolStore.get(key);
  if (!entry) {
    return void 0;
  }
  try {
    const testQuery = getTestQuery(entry.dialect);
    await executeTestQuery(entry.pool, entry.dialect, testQuery);
    return entry.pool;
  } catch (error) {
    console.warn(
      `\u26A0\uFE0F Pool "${key}" failed health check, removing from store:`,
      error
    );
    await closePoolByDialect(entry.pool, entry.dialect).catch(() => {
    });
    poolStore.delete(key);
    return void 0;
  }
}
function getPoolDialect(key) {
  return poolStore.get(key)?.dialect;
}
async function closePoolByDialect(pool, dialect) {
  switch (dialect) {
    case "postgres":
    case "mysql":
    case "sqlite":
      await pool.end();
      break;
    case "sqlserver":
    case "oracle":
      await pool.close();
      break;
    default:
      console.warn(`Unknown dialect for pool cleanup: ${dialect}`);
  }
}
async function waitForPoolReady(pool, dialect, key, maxRetries = 10, retryDelay = 500) {
  const testQuery = getTestQuery(dialect);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.info(
        `\u{1F504} Testing database connectivity for pool "${key}" (attempt ${attempt}/${maxRetries})`
      );
      await executeTestQuery(pool, dialect, testQuery);
      console.info(`\u2705 Database pool "${key}" is ready and responsive`);
      return;
    } catch (error) {
      console.warn(
        `\u274C Database connectivity test failed for pool "${key}" (attempt ${attempt}/${maxRetries}):`,
        error
      );
      if (attempt === maxRetries) {
        throw new Error(
          `Database pool "${key}" failed to become ready after ${maxRetries} attempts. Last error: ${error}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}
function getTestQuery(dialect) {
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
async function executeTestQuery(pool, dialect, query) {
  switch (dialect) {
    case "postgres": {
      const pgPool = pool;
      const client = await pgPool.connect();
      try {
        await client.query(query);
      } finally {
        client.release();
      }
      break;
    }
    case "mysql": {
      const mysqlPool = pool;
      const connection = await mysqlPool.getConnection();
      try {
        await connection.execute(query);
      } finally {
        connection.release();
      }
      break;
    }
    case "sqlite": {
      const sqlitePool = pool;
      await sqlitePool.query(query);
      break;
    }
    case "sqlserver": {
      const sqlServerPool = pool;
      const request = sqlServerPool.request();
      await request.query(query);
      break;
    }
    case "oracle": {
      const oraclePool = pool;
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
function listActivePools() {
  return Array.from(poolStore.entries()).map(([key, { dialect }]) => ({
    key,
    dialect
  }));
}
function hasPool(key) {
  return poolStore.has(key);
}
async function removeAllPools() {
  const keys = Array.from(poolStore.keys());
  const promises = keys.map((key) => removePool(key));
  await Promise.all(promises);
  console.info("\u2705 All connection pools have been closed and removed.");
}
function getActivePoolCount() {
  return poolStore.size;
}
async function removePool(key) {
  const entry = poolStore.get(key);
  if (entry) {
    await closePoolByDialect(entry.pool, entry.dialect);
    poolStore.delete(key);
    console.info(`\u2705 Connection pool closed and removed for key: ${key}`);
  } else {
    console.warn(`No pool found with key "${key}" to remove.`);
  }
}
export {
  createPool,
  getActivePoolCount,
  getPool,
  getPoolDialect,
  hasPool,
  listActivePools,
  removeAllPools,
  removePool
};

import { Pool as PgPool } from "pg";
import * as mysql from "mysql2/promise";
import Database from "better-sqlite3";
import mssql from "mssql";
import oracledb from "oracledb";
import { Dialect } from "./mappings.ts";

// Explicit pool interfaces to avoid circular ReturnType self-reference
export type PostgresPool = PgPool;
export type MysqlPool = mysql.Pool;
export interface SqlitePool {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{
    rows?: unknown[];
    rowCount?: number;
    affectedRows?: number;
  }>;
  end: () => Promise<void>;
  db: Database.Database;
}
export type SqlServerPool = mssql.ConnectionPool;
export interface OraclePool {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{
    rows?: unknown[];
    rowCount?: number;
    affectedRows?: number;
  }>;
  close: () => Promise<unknown>;
  getConnection: () => Promise<oracledb.Connection>;
}

export type DatabasePool =
  | PostgresPool
  | MysqlPool
  | SqlitePool
  | SqlServerPool
  | OraclePool;

// Legacy function for backwards compatibility (assumes PostgreSQL)
export function newSandboxPool(
  dsn: string,
  onClose?: () => void,
): PostgresPool {
  return newPostgresPool(dsn, onClose);
}

export function newPostgresPool(
  dsn: string,
  onClose?: () => void,
): PostgresPool {
  const pool = new PgPool({
    connectionString: dsn,
    max: 1,
    idleTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    statement_timeout: 10_000,
  });
  const originalEnd = pool.end.bind(pool);
  pool.end = async () => {
    await originalEnd();
    if (onClose) onClose();
  };
  return pool;
}

export function newMysqlPool(dsn: string, onClose?: () => void): MysqlPool {
  const pool = mysql.createPool({
    uri: dsn,
    connectionLimit: 1,
    idleTimeout: 5_000,
  });
  const originalEnd = pool.end.bind(pool);
  pool.end = () => {
    const result = originalEnd();
    if (onClose) onClose();
    return result;
  };
  return pool;
}

export function newSqlitePool(dsn: string, onClose?: () => void): SqlitePool {
  const db = new Database(dsn);
  const sqlitePool: SqlitePool = {
    db,
    query: (sql: string, params?: unknown[]) => {
      return new Promise((resolve, reject) => {
        try {
          // Handle SELECT queries
          if (sql.trim().toLowerCase().startsWith("select")) {
            const stmt = db.prepare(sql);
            const rows = stmt.all(params ?? []);
            resolve({ rows: rows as Record<string, unknown>[] });
          } else {
            // Handle INSERT, UPDATE, DELETE queries
            const stmt = db.prepare(sql);
            const result = stmt.run(params ?? []);
            resolve({
              rows: [],
              rowCount: result.changes,
              affectedRows: result.changes,
            });
          }
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },
    end: () => {
      return new Promise<void>((resolve) => {
        db.close();
        if (onClose) onClose();
        resolve();
      });
    },
  };
  return sqlitePool;
}

/**
 * Parses a SQL Server connection string URL into mssql config object.
 * Expected format: sqlserver://user:password@host:port?database=dbname&trustServerCertificate=true
 */
function parseSqlServerConnectionString(dsn: string): mssql.config {
  const url = new URL(dsn);

  const config: mssql.config = {
    server: url.hostname,
    port: parseInt(url.port) || 1433,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.searchParams.get("database") || "master",
    options: {
      encrypt: false,
      trustServerCertificate:
        url.searchParams.get("trustServerCertificate") === "true",
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  return config;
}

export async function newSqlServerPool(
  dsn: string,
  onClose?: () => void,
): Promise<SqlServerPool> {
  const config = parseSqlServerConnectionString(dsn);
  const pool = new mssql.ConnectionPool(config);
  await pool.connect();
  const originalClose = pool.close.bind(pool);
  pool.close = async () => {
    await originalClose();
    if (onClose) onClose();
  };
  return pool;
}

export async function newOraclePool(
  dsn: string,
  onClose?: () => void,
): Promise<OraclePool> {
  const pool = await oracledb.createPool({
    connectString: dsn,
    poolMin: 0,
    poolMax: 1,
    poolTimeout: 5,
    queueMax: 0,
  });
  const originalClose = pool.close.bind(pool);
  pool.close = async () => {
    await originalClose();
    if (onClose) onClose();
  };
  const oraclePool: OraclePool = Object.assign(pool, {
    async query(sql: string, params?: unknown[]) {
      const connection = await pool.getConnection();
      try {
        const result = await connection.execute(sql, params ?? []);
        const resultWithRows = result as {
          rows?: unknown[];
          rowsAffected?: number;
        };
        return {
          rows: resultWithRows.rows,
          rowCount: resultWithRows.rowsAffected ?? 0,
          affectedRows: resultWithRows.rowsAffected,
        };
      } finally {
        await connection.close();
      }
    },
  });
  return oraclePool;
}

export async function createDatabasePool(
  dialect: Dialect,
  dsn: string,
  onClose?: () => void,
): Promise<DatabasePool> {
  switch (dialect) {
    case "postgres":
      return newPostgresPool(dsn, onClose);
    case "mysql":
      return newMysqlPool(dsn, onClose);
    case "sqlite":
      return newSqlitePool(dsn, onClose);
    case "sqlserver":
      return await newSqlServerPool(dsn, onClose);
    case "oracle":
      return await newOraclePool(dsn, onClose);
    default:
      throw new Error(`Unsupported database dialect: ${dialect}`);
  }
}

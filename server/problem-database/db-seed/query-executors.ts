import { HTTPException } from "hono/http-exception";
import type {
  DatabasePool,
  MysqlPool,
  OraclePool,
  PostgresPool,
  SqlitePool,
  SqlServerPool,
} from "../pools.ts";
import type { DialectPoolReturn, QueryResult } from "./types.ts";
import type { Dialect } from "server/problem-database/mappings.ts";

// Type-safe pool narrowing function based on dialect
export function narrowPool<T extends Dialect>(
  pool: DatabasePool,
  dialect: T,
): DialectPoolReturn[T] {
  switch (dialect) {
    case "postgres":
      return pool as DialectPoolReturn[T];
    case "mysql":
      return pool as DialectPoolReturn[T];
    case "sqlite":
      return pool as DialectPoolReturn[T];
    case "sqlserver":
      return pool as DialectPoolReturn[T];
    case "oracle":
      return pool as DialectPoolReturn[T];
    default:
      throw new HTTPException(500, {
        message: `Unsupported dialect: ${dialect}`,
      });
  }
}

// Dialect-specific query execution functions for better type safety
export async function executePostgresQuery(
  pool: PostgresPool,
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<QueryResult> {
  const result = await pool.query(sql, params);
  console.info("Postgres query result:", result);
  return {
    rows: result.rows as Record<string, unknown>[],
    rowCount: result.rowCount ?? 0,
  };
}

export async function executeMysqlQuery(
  pool: MysqlPool,
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<QueryResult> {
  const [rows] = await pool.execute(sql, params);
  return {
    rows: rows as Record<string, unknown>[],
    affectedRows: (rows as { affectedRows?: number }).affectedRows,
  };
}

export async function executeSqliteQuery(
  pool: SqlitePool,
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<QueryResult> {
  const result = await pool.query(sql, params);
  return result as QueryResult;
}

export async function executeSqlServerQuery(
  pool: SqlServerPool,
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<QueryResult> {
  const request = pool.request();
  if (params) {
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    // Replace ? with @param0, @param1, etc. for SQL Server
    let modifiedSql = sql;
    params.forEach((_, index) => {
      modifiedSql = modifiedSql.replace("?", `@param${index}`);
    });
    sql = modifiedSql;
  }
  const result = await request.query(sql);
  return {
    rows: result.recordset as Record<string, unknown>[],
    rowCount: result.rowsAffected[0] || 0,
  };
}

export async function executeOracleQuery(
  pool: OraclePool,
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<QueryResult> {
  const result = await pool.query(sql, params ?? []);
  return {
    rows: result.rows as Record<string, unknown>[],
    rowCount: result.rowCount ?? result.affectedRows ?? 0,
  };
}

import { HTTPException } from "hono/http-exception";
import type { SqlitePool } from "../../pools.ts";
import { quoteIdent } from "../helpers.ts";
import { executeSqliteQuery } from "../query-executors.ts";
import { seedTable } from "../generic-seeding.ts";
import type { SeedTable } from "../types.ts";
import {
  getSqlType,
  type MappedRelation,
} from "server/problem-database/mappings.ts";

export async function createTableSqlite(
  pool: SqlitePool,
  table: SeedTable,
): Promise<void> {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`,
    });
  }

  const columnsDDL = table.column_types
    .map((col) => {
      return `${quoteIdent("sqlite", col.column)} ${getSqlType(
        "sqlite",
        col.type,
      )} ${col.isPrimaryKey ? "PRIMARY KEY" : ""}`;
    })
    .join(", ");

  const createSql = `CREATE TABLE IF NOT EXISTS ${quoteIdent(
    "sqlite",
    table.table_name,
  )} (${columnsDDL});`;

  try {
    await executeSqliteQuery(pool, createSql);
    console.info(
      `✅ Successfully created sqlite table: ${table.table_name} with ${table.column_types.length} columns`,
    );
  } catch (error) {
    console.error(`❌ Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}

//TODO: remove sqlite support
// eslint-disable-next-line @typescript-eslint/require-await
export async function setRelationsSqlite(
  pool: SqlitePool,
  baseTableName: string,
  relations: MappedRelation[] | null,
): Promise<void> {
  if (!relations || relations.length === 0) return;

  // SQLite doesn't support adding foreign key constraints to existing tables
  // Foreign keys must be defined during table creation
  console.warn(
    `⚠️ SQLite doesn't support adding foreign key constraints after table creation. Relations for ${baseTableName} were ignored.`,
  );
}

export async function seedTableSqlite(
  pool: SqlitePool,
  table: SeedTable,
): Promise<void> {
  await seedTable(pool, table, "sqlite");
}

export async function ensureForeignTableExistsSqlite(
  pool: SqlitePool,
  foreignTableName: string,
): Promise<void> {
  const result = await executeSqliteQuery(
    pool,
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [foreignTableName],
  );

  const tableExists = result.rows && result.rows.length > 0;
  if (!tableExists) {
    throw new HTTPException(400, {
      message: `Foreign table '${foreignTableName}' does not exist`,
    });
  }
}

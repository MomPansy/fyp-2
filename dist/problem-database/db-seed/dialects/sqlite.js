import { HTTPException } from "hono/http-exception";
import { quoteIdent } from "../helpers.js";
import { executeSqliteQuery } from "../query-executors.js";
import { seedTable } from "../generic-seeding.js";
async function createTableSqlite(pool, table) {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`
    });
  }
  const columnsDDL = table.column_types.map((col) => {
    return `${quoteIdent("sqlite", col.column)} ${col.type} ${col.isPrimaryKey ? "PRIMARY KEY" : ""}`;
  }).join(", ");
  const createSql = `CREATE TABLE IF NOT EXISTS ${quoteIdent(
    "sqlite",
    table.table_name
  )} (${columnsDDL});`;
  try {
    await executeSqliteQuery(pool, createSql);
    console.info(
      `\u2705 Successfully created sqlite table: ${table.table_name} with ${table.column_types.length} columns`
    );
  } catch (error) {
    console.error(`\u274C Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}
async function setRelationsSqlite(_pool, baseTableName, relations) {
  if (!relations || relations.length === 0) return;
  console.warn(
    `\u26A0\uFE0F SQLite doesn't support adding foreign key constraints after table creation. Relations for ${baseTableName} were ignored.`
  );
}
async function seedTableSqlite(pool, table) {
  await seedTable(pool, table, "sqlite");
}
async function ensureForeignTableExistsSqlite(pool, foreignTableName) {
  const result = await executeSqliteQuery(
    pool,
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [foreignTableName]
  );
  const tableExists = result.rows && result.rows.length > 0;
  if (!tableExists) {
    throw new HTTPException(400, {
      message: `Foreign table '${foreignTableName}' does not exist`
    });
  }
}
export {
  createTableSqlite,
  ensureForeignTableExistsSqlite,
  seedTableSqlite,
  setRelationsSqlite
};

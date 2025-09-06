// Re-export types
export type {
  CountResult,
  DatabaseOperations,
  DialectPoolReturn,
  ExistsResult,
  QueryResult,
  SeedTable,
} from "./types.ts";

// Re-export utilities
export {
  isBooleanType,
  isCountResult,
  isExistsResult,
  isNumericType,
  isTextType,
  quoteIdent,
} from "./helpers.ts";
export { sortTablesByDependencies } from "./sort-tables.ts";
export { narrowPool } from "./query-executors.ts";

// Re-export operations factory
export { getDatabaseOperations } from "./operations.ts";

// Re-export generic seeding
export { seedTable } from "./generic-seeding.ts";

// Re-export dialect-specific functions for backward compatibility and direct use
export {
  createTablePostgres,
  ensureForeignTableExistsPostgres,
  seedTablePostgres,
  setRelationsPostgres,
} from "./dialects/postgres.ts";

export {
  createTableMysql,
  ensureForeignTableExistsMysql,
  seedTableMysql,
  setRelationsMysql,
} from "./dialects/mysql.ts";

export {
  createTableSqlite,
  ensureForeignTableExistsSqlite,
  seedTableSqlite,
  setRelationsSqlite,
} from "./dialects/sqlite.ts";

export {
  createTableSqlServer,
  ensureForeignTableExistsSqlServer,
  seedTableSqlServer,
  setRelationsSqlServer,
} from "./dialects/sqlserver.ts";

export {
  createTableOracle,
  ensureForeignTableExistsOracle,
  seedTableOracle,
  setRelationsOracle,
} from "./dialects/oracle.ts";

// High-level functions
import type { DatabasePool } from "../pools.ts";
import type { SeedTable } from "./types.ts";
import { sortTablesByDependencies } from "./sort-tables.ts";
import { getDatabaseOperations } from "./operations.ts";
import type { Dialect } from "server/problem-database/mappings.ts";

// Abstract function to create and seed tables for any dialect
async function createAndSeedTable(
  pool: DatabasePool,
  table: SeedTable,
  dialect: Dialect,
): Promise<void> {
  const operations = getDatabaseOperations(dialect);
  await operations.createTable(pool, table);
  await operations.setRelations(pool, table.table_name, table.relations);
  await operations.seedTable(pool, table);
}

export async function seedDatabase(
  pool: DatabasePool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  console.info(`🏗️ Starting table creation for ${tables.length} tables...`);

  const sortedTables = sortTablesByDependencies(tables);

  for (const table of sortedTables) {
    console.info(`\n➡️ Creating and seeding table: ${table.table_name}`);
    await createAndSeedTable(pool, table, dialect);
  }
}

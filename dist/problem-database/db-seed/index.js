import {
  isBooleanType,
  isCountResult,
  isExistsResult,
  isNumericType,
  isTextType,
  quoteIdent
} from "./helpers.js";
import { sortTablesByDependencies } from "./sort-tables.js";
import { narrowPool } from "./query-executors.js";
import { getDatabaseOperations } from "./operations.js";
import { seedTable } from "./generic-seeding.js";
import {
  createTablePostgres,
  ensureForeignTableExistsPostgres,
  seedTablePostgres,
  setRelationsPostgres
} from "./dialects/postgres.js";
import {
  createTableMysql,
  ensureForeignTableExistsMysql,
  seedTableMysql,
  setRelationsMysql
} from "./dialects/mysql.js";
import {
  createTableSqlite,
  ensureForeignTableExistsSqlite,
  seedTableSqlite,
  setRelationsSqlite
} from "./dialects/sqlite.js";
import {
  createTableSqlServer,
  ensureForeignTableExistsSqlServer,
  seedTableSqlServer,
  setRelationsSqlServer
} from "./dialects/sqlserver.js";
import {
  createTableOracle,
  ensureForeignTableExistsOracle,
  seedTableOracle,
  setRelationsOracle
} from "./dialects/oracle.js";
import { sortTablesByDependencies as sortTablesByDependencies2 } from "./sort-tables.js";
import { getDatabaseOperations as getDatabaseOperations2 } from "./operations.js";
async function createAndSeedTable(pool, table, dialect) {
  const operations = getDatabaseOperations2(dialect);
  await operations.createTable(pool, table);
  await operations.setRelations(pool, table.table_name, table.relations);
  await operations.seedTable(pool, table);
}
async function seedDatabase(pool, tables, dialect) {
  console.info(`\u{1F3D7}\uFE0F Starting table creation for ${tables.length} tables...`);
  const sortedTables = sortTablesByDependencies2(tables);
  for (const table of sortedTables) {
    console.info(`
\u27A1\uFE0F Creating and seeding table: ${table.table_name}`);
    await createAndSeedTable(pool, table, dialect);
  }
}
export {
  createTableMysql,
  createTableOracle,
  createTablePostgres,
  createTableSqlServer,
  createTableSqlite,
  ensureForeignTableExistsMysql,
  ensureForeignTableExistsOracle,
  ensureForeignTableExistsPostgres,
  ensureForeignTableExistsSqlServer,
  ensureForeignTableExistsSqlite,
  getDatabaseOperations,
  isBooleanType,
  isCountResult,
  isExistsResult,
  isNumericType,
  isTextType,
  narrowPool,
  quoteIdent,
  seedDatabase,
  seedTable,
  seedTableMysql,
  seedTableOracle,
  seedTablePostgres,
  seedTableSqlServer,
  seedTableSqlite,
  setRelationsMysql,
  setRelationsOracle,
  setRelationsPostgres,
  setRelationsSqlServer,
  setRelationsSqlite,
  sortTablesByDependencies
};

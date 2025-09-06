import { HTTPException } from "hono/http-exception";
import type { DatabaseOperations } from "./types.ts";
import {
  createTablePostgres,
  ensureForeignTableExistsPostgres,
  seedTablePostgres,
  setRelationsPostgres,
} from "./dialects/postgres.ts";
import {
  createTableMysql,
  ensureForeignTableExistsMysql,
  seedTableMysql,
  setRelationsMysql,
} from "./dialects/mysql.ts";
import {
  createTableSqlite,
  ensureForeignTableExistsSqlite,
  seedTableSqlite,
  setRelationsSqlite,
} from "./dialects/sqlite.ts";
import {
  createTableSqlServer,
  ensureForeignTableExistsSqlServer,
  seedTableSqlServer,
  setRelationsSqlServer,
} from "./dialects/sqlserver.ts";
import {
  createTableOracle,
  ensureForeignTableExistsOracle,
  seedTableOracle,
  setRelationsOracle,
} from "./dialects/oracle.ts";
import type { Dialect } from "server/problem-database/mappings.ts";

// PostgreSQL operations
const postgresOperations: DatabaseOperations = {
  createTable: createTablePostgres,
  setRelations: setRelationsPostgres,
  seedTable: seedTablePostgres,
  ensureForeignTableExists: ensureForeignTableExistsPostgres,
};

// MySQL operations
const mysqlOperations: DatabaseOperations = {
  createTable: createTableMysql,
  setRelations: setRelationsMysql,
  seedTable: seedTableMysql,
  ensureForeignTableExists: ensureForeignTableExistsMysql,
};

// SQLite operations
const sqliteOperations: DatabaseOperations = {
  createTable: createTableSqlite,
  setRelations: setRelationsSqlite,
  seedTable: seedTableSqlite,
  ensureForeignTableExists: ensureForeignTableExistsSqlite,
};

// SQL Server operations
const sqlServerOperations: DatabaseOperations = {
  createTable: createTableSqlServer,
  setRelations: setRelationsSqlServer,
  seedTable: seedTableSqlServer,
  ensureForeignTableExists: ensureForeignTableExistsSqlServer,
};

// Oracle operations
const oracleOperations: DatabaseOperations = {
  createTable: createTableOracle,
  setRelations: setRelationsOracle,
  seedTable: seedTableOracle,
  ensureForeignTableExists: ensureForeignTableExistsOracle,
};

// Factory function to get database operations for each dialect
export function getDatabaseOperations(dialect: Dialect): DatabaseOperations {
  switch (dialect) {
    case "postgres":
      return postgresOperations;
    case "mysql":
      return mysqlOperations;
    case "sqlite":
      return sqliteOperations;
    case "sqlserver":
      return sqlServerOperations;
    case "oracle":
      return oracleOperations;
    default:
      throw new HTTPException(500, {
        message: `Unsupported dialect: ${dialect}`,
      });
  }
}

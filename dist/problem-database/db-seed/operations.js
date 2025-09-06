import { HTTPException } from "hono/http-exception";
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
const postgresOperations = {
  createTable: createTablePostgres,
  setRelations: setRelationsPostgres,
  seedTable: seedTablePostgres,
  ensureForeignTableExists: ensureForeignTableExistsPostgres
};
const mysqlOperations = {
  createTable: createTableMysql,
  setRelations: setRelationsMysql,
  seedTable: seedTableMysql,
  ensureForeignTableExists: ensureForeignTableExistsMysql
};
const sqliteOperations = {
  createTable: createTableSqlite,
  setRelations: setRelationsSqlite,
  seedTable: seedTableSqlite,
  ensureForeignTableExists: ensureForeignTableExistsSqlite
};
const sqlServerOperations = {
  createTable: createTableSqlServer,
  setRelations: setRelationsSqlServer,
  seedTable: seedTableSqlServer,
  ensureForeignTableExists: ensureForeignTableExistsSqlServer
};
const oracleOperations = {
  createTable: createTableOracle,
  setRelations: setRelationsOracle,
  seedTable: seedTableOracle,
  ensureForeignTableExists: ensureForeignTableExistsOracle
};
function getDatabaseOperations(dialect) {
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
        message: `Unsupported dialect: ${dialect}`
      });
  }
}
export {
  getDatabaseOperations
};

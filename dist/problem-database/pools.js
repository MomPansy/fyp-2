import { Pool as PgPool } from "pg";
import * as mysql from "mysql2/promise";
import * as sqlite3 from "sqlite3";
import { ConnectionPool as MssqlPool } from "mssql";
import oracledb from "oracledb";
function newSandboxPool(dsn, onClose) {
  return newPostgresPool(dsn, onClose);
}
function newPostgresPool(dsn, onClose) {
  const pool = new PgPool({
    connectionString: dsn,
    max: 1,
    idleTimeoutMillis: 5e3,
    allowExitOnIdle: true,
    statement_timeout: 1e4
  });
  const originalEnd = pool.end.bind(pool);
  pool.end = async () => {
    await originalEnd();
    if (onClose) onClose();
  };
  return pool;
}
function newMysqlPool(dsn, onClose) {
  const pool = mysql.createPool({
    uri: dsn,
    connectionLimit: 1,
    idleTimeout: 5e3
  });
  const originalEnd = pool.end.bind(pool);
  pool.end = () => {
    const result = originalEnd();
    if (onClose) onClose();
    return result;
  };
  return pool;
}
function newSqlitePool(dsn, onClose) {
  const db = new sqlite3.Database(dsn);
  const sqlitePool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        db.all(text, params ?? [], (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    },
    end: () => {
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else {
            if (onClose) onClose();
            resolve();
          }
        });
      });
    }
  };
  return sqlitePool;
}
function newSqlServerPool(dsn, onClose) {
  const pool = new MssqlPool(dsn);
  const originalClose = pool.close.bind(pool);
  pool.close = async () => {
    await originalClose();
    if (onClose) onClose();
  };
  return pool;
}
async function newOraclePool(dsn, onClose) {
  const pool = await oracledb.createPool({
    connectString: dsn,
    poolMin: 0,
    poolMax: 1,
    poolTimeout: 5,
    queueMax: 0
  });
  const originalClose = pool.close.bind(pool);
  pool.close = async () => {
    await originalClose();
    if (onClose) onClose();
  };
  const oraclePool = Object.assign(pool, {
    async query(sql, params) {
      const connection = await pool.getConnection();
      try {
        const result = await connection.execute(sql, params ?? []);
        const resultWithRows = result;
        return {
          rows: resultWithRows.rows,
          rowCount: resultWithRows.rowsAffected ?? 0,
          affectedRows: resultWithRows.rowsAffected
        };
      } finally {
        await connection.close();
      }
    }
  });
  return oraclePool;
}
async function createDatabasePool(dialect, dsn, onClose) {
  switch (dialect) {
    case "postgres":
      return newPostgresPool(dsn, onClose);
    case "mysql":
      return newMysqlPool(dsn, onClose);
    case "sqlite":
      return newSqlitePool(dsn, onClose);
    case "sqlserver":
      return newSqlServerPool(dsn, onClose);
    case "oracle":
      return await newOraclePool(dsn, onClose);
    default:
      throw new Error(`Unsupported database dialect: ${dialect}`);
  }
}
export {
  createDatabasePool,
  newMysqlPool,
  newOraclePool,
  newPostgresPool,
  newSandboxPool,
  newSqlServerPool,
  newSqlitePool
};

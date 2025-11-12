import { HTTPException } from "hono/http-exception";
function narrowPool(pool, dialect) {
  switch (dialect) {
    case "postgres":
      return pool;
    case "mysql":
      return pool;
    case "sqlite":
      return pool;
    case "sqlserver":
      return pool;
    case "oracle":
      return pool;
    default:
      throw new HTTPException(500, {
        message: `Unsupported dialect: ${dialect}`
      });
  }
}
async function executePostgresQuery(pool, sql, params) {
  const result = await pool.query(sql, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? 0
  };
}
async function executeMysqlQuery(pool, sql, params) {
  const [rows] = await pool.execute(sql, params);
  return {
    rows,
    affectedRows: rows.affectedRows
  };
}
async function executeSqliteQuery(pool, sql, params) {
  const result = await pool.query(sql, params);
  return result;
}
async function executeSqlServerQuery(pool, sql, params) {
  const request = pool.request();
  if (params) {
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    let modifiedSql = sql;
    params.forEach((_, index) => {
      modifiedSql = modifiedSql.replace("?", `@param${index}`);
    });
    sql = modifiedSql;
  }
  const result = await request.query(sql);
  return {
    rows: result.recordset,
    rowCount: result.rowsAffected[0] || 0
  };
}
async function executeOracleQuery(pool, sql, params) {
  const result = await pool.query(sql, params ?? []);
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? result.affectedRows ?? 0
  };
}
export {
  executeMysqlQuery,
  executeOracleQuery,
  executePostgresQuery,
  executeSqlServerQuery,
  executeSqliteQuery,
  narrowPool
};

import { HTTPException } from "hono/http-exception";
import { isCountResult, quoteIdent } from "../helpers.js";
import { executeSqlServerQuery } from "../query-executors.js";
import { seedTable } from "../generic-seeding.js";
async function createTableSqlServer(pool, table) {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`
    });
  }
  const columnsDDL = table.column_types.map((col) => {
    return `${quoteIdent("sqlserver", col.column)} ${col.type} ${col.isPrimaryKey ? "PRIMARY KEY" : ""}`;
  }).join(", ");
  const createSql = `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${table.table_name}' AND xtype='U')
    CREATE TABLE ${quoteIdent("sqlserver", table.table_name)} (${columnsDDL});`;
  try {
    await executeSqlServerQuery(pool, createSql);
    console.info(
      `\u2705 Successfully created sql server table: ${table.table_name} with ${table.column_types.length} columns`
    );
  } catch (error) {
    console.error(`\u274C Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}
async function setRelationsSqlServer(pool, baseTableName, relations) {
  if (!relations || relations.length === 0) return;
  for (const rel of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = rel;
    try {
      await ensureForeignTableExistsSqlServer(pool, foreignTableName);
      const constraintName = `FK_${baseColumnName}_${foreignTableName}`;
      const constraintCheck = await executeSqlServerQuery(
        pool,
        `SELECT COUNT(*) as count FROM sys.foreign_keys WHERE name = '${constraintName}'`
      );
      const firstRow = constraintCheck.rows?.[0];
      const constraintExists = firstRow && isCountResult(firstRow) ? firstRow.count > 0 : false;
      if (constraintExists) {
        console.info(
          `Constraint ${constraintName} already exists on ${baseTableName}, skipping`
        );
        continue;
      }
      const sql = `
        ALTER TABLE ${quoteIdent("sqlserver", baseTableName)}
        ADD CONSTRAINT ${quoteIdent("sqlserver", constraintName)}
        FOREIGN KEY (${quoteIdent("sqlserver", baseColumnName)})
        REFERENCES ${quoteIdent("sqlserver", foreignTableName)}(${quoteIdent(
        "sqlserver",
        foreignTableColumn
      )})
        ON DELETE CASCADE
      `;
      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`
      );
      await executeSqlServerQuery(pool, sql);
      console.info(
        `\u2705 Successfully added foreign key constraint: ${constraintName}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const relationError = `Failed to set relation ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}: ${errorMessage}`;
      console.error(`\u274C ${relationError}`);
      throw new HTTPException(500, { message: relationError });
    }
  }
}
async function seedTableSqlServer(pool, table) {
  await seedTable(pool, table, "sqlserver");
}
async function ensureForeignTableExistsSqlServer(pool, foreignTableName) {
  const result = await executeSqlServerQuery(
    pool,
    `SELECT COUNT(*) as count FROM sysobjects WHERE name='${foreignTableName}' AND xtype='U'`
  );
  const firstRow = result.rows?.[0];
  const tableExists = firstRow && isCountResult(firstRow) ? firstRow.count > 0 : false;
  if (!tableExists) {
    throw new HTTPException(400, {
      message: `Foreign table '${foreignTableName}' does not exist`
    });
  }
}
export {
  createTableSqlServer,
  ensureForeignTableExistsSqlServer,
  seedTableSqlServer,
  setRelationsSqlServer
};

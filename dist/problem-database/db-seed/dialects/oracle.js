import { HTTPException } from "hono/http-exception";
import { isCountResult, quoteIdent } from "../helpers.js";
import { executeOracleQuery } from "../query-executors.js";
import { seedTable } from "../generic-seeding.js";
async function createTableOracle(pool, table) {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`
    });
  }
  const columnsDDL = table.column_types.map((col) => {
    return `${quoteIdent("oracle", col.column)} ${col.type} ${col.isPrimaryKey ? "PRIMARY KEY" : ""}`;
  }).join(", ");
  const tableExistsQuery = `SELECT COUNT(*) as count FROM user_tables WHERE table_name = UPPER('${table.table_name}')`;
  try {
    const existsResult = await executeOracleQuery(pool, tableExistsQuery);
    const firstRow = existsResult.rows?.[0];
    const tableExists = firstRow && isCountResult(firstRow) ? firstRow.count > 0 : false;
    if (!tableExists) {
      const createSql = `CREATE TABLE ${quoteIdent(
        "oracle",
        table.table_name
      )} (${columnsDDL})`;
      await executeOracleQuery(pool, createSql);
      console.info(
        `\u2705 Successfully created oracle table: ${table.table_name} with ${table.column_types.length} columns`
      );
    } else {
      console.info(`\u2705 Table ${table.table_name} already exists in Oracle`);
    }
  } catch (error) {
    console.error(`\u274C Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}
async function setRelationsOracle(pool, baseTableName, relations) {
  if (!relations || relations.length === 0) return;
  for (const rel of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = rel;
    try {
      await ensureForeignTableExistsOracle(pool, foreignTableName);
      const constraintName = `FK_${baseColumnName}_${foreignTableName}`.toUpperCase();
      const constraintCheck = await executeOracleQuery(
        pool,
        `SELECT COUNT(*) as count FROM user_constraints WHERE constraint_name = '${constraintName}' AND constraint_type = 'R'`
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
        ALTER TABLE ${quoteIdent("oracle", baseTableName)}
        ADD CONSTRAINT ${quoteIdent("oracle", constraintName)}
        FOREIGN KEY (${quoteIdent("oracle", baseColumnName)})
        REFERENCES ${quoteIdent("oracle", foreignTableName)}(${quoteIdent(
        "oracle",
        foreignTableColumn
      )})
        ON DELETE CASCADE
      `;
      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`
      );
      await executeOracleQuery(pool, sql);
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
async function seedTableOracle(pool, table) {
  await seedTable(pool, table, "oracle");
}
async function ensureForeignTableExistsOracle(pool, foreignTableName) {
  const result = await executeOracleQuery(
    pool,
    `SELECT COUNT(*) as count FROM user_tables WHERE table_name = UPPER('${foreignTableName}')`
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
  createTableOracle,
  ensureForeignTableExistsOracle,
  seedTableOracle,
  setRelationsOracle
};

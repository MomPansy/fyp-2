import { HTTPException } from "hono/http-exception";
import type { MysqlPool } from "../../pools.ts";
import { isCountResult, quoteIdent } from "../helpers.ts";
import { executeMysqlQuery } from "../query-executors.ts";
import { seedTable } from "../generic-seeding.ts";
import type { SeedTable } from "../types.ts";
import {
  getSqlType,
  type MappedRelation,
} from "server/problem-database/mappings.ts";

export async function createTableMysql(
  pool: MysqlPool,
  table: SeedTable,
): Promise<void> {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`,
    });
  }

  const columnsDDL = table.column_types
    .map((col) => {
      return `${quoteIdent("mysql", col.column)} ${getSqlType(
        "mysql",
        col.type,
      )} ${col.isPrimaryKey ? "PRIMARY KEY" : ""}`;
    })
    .join(", ");

  const createSql = `CREATE TABLE IF NOT EXISTS ${quoteIdent(
    "mysql",
    table.table_name,
  )} (${columnsDDL});`;

  try {
    await executeMysqlQuery(pool, createSql);
    console.info(
      `✅ Successfully created mysql table: ${table.table_name} with ${table.column_types.length} columns`,
    );
  } catch (error) {
    console.error(`❌ Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}

export async function setRelationsMysql(
  pool: MysqlPool,
  baseTableName: string,
  relations: MappedRelation[] | null,
): Promise<void> {
  if (!relations || relations.length === 0) return;

  for (const rel of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = rel;
    try {
      await ensureForeignTableExistsMysql(pool, foreignTableName);

      const constraintName = `fk_${baseColumnName}_${foreignTableName}`;

      // Check if constraint already exists
      const constraintCheck = await executeMysqlQuery(
        pool,
        `SELECT COUNT(*) as count FROM information_schema.TABLE_CONSTRAINTS 
         WHERE TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
        [baseTableName, constraintName],
      );

      const firstRow = constraintCheck.rows?.[0];
      const constraintExists =
        firstRow && isCountResult(firstRow) ? firstRow.count > 0 : false;
      if (constraintExists) {
        console.info(
          `Constraint ${constraintName} already exists on ${baseTableName}, skipping`,
        );
        continue;
      }

      const sql = `
        ALTER TABLE ${quoteIdent("mysql", baseTableName)}
        ADD CONSTRAINT ${quoteIdent("mysql", constraintName)}
        FOREIGN KEY (${quoteIdent("mysql", baseColumnName)})
        REFERENCES ${quoteIdent("mysql", foreignTableName)}(${quoteIdent(
          "mysql",
          foreignTableColumn,
        )})
        ON DELETE CASCADE
      `;

      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
      );
      await executeMysqlQuery(pool, sql);
      console.info(
        `✅ Successfully added foreign key constraint: ${constraintName}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const relationError = `Failed to set relation ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}: ${errorMessage}`;

      console.error(`❌ ${relationError}`);
      throw new HTTPException(500, { message: relationError });
    }
  }
}

export async function seedTableMysql(
  pool: MysqlPool,
  table: SeedTable,
): Promise<void> {
  await seedTable(pool, table, "mysql");
}

export async function ensureForeignTableExistsMysql(
  pool: MysqlPool,
  foreignTableName: string,
): Promise<void> {
  const result = await executeMysqlQuery(
    pool,
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ?`,
    [foreignTableName],
  );

  const firstRow = result.rows?.[0];
  const tableExists =
    firstRow && isCountResult(firstRow) ? firstRow.count > 0 : false;
  if (!tableExists) {
    throw new HTTPException(400, {
      message: `Foreign table '${foreignTableName}' does not exist`,
    });
  }
}

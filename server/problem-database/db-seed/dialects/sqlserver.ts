import { HTTPException } from "hono/http-exception";
import type { SqlServerPool } from "../../pools.ts";
import { isCountResult, quoteIdent } from "../helpers.ts";
import { executeSqlServerQuery } from "../query-executors.ts";
import { seedTable } from "../generic-seeding.ts";
import type { SeedTable } from "../types.ts";
import { type MappedRelation } from "server/problem-database/mappings.ts";

export async function createTableSqlServer(
  pool: SqlServerPool,
  table: SeedTable,
): Promise<void> {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`,
    });
  }

  const columnsDDL = table.column_types
    .map((col) => {
      return `${quoteIdent("sqlserver", col.column)} ${col.type} ${
        col.isPrimaryKey ? "PRIMARY KEY" : ""
      }`;
    })
    .join(", ");

  const createSql = `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${table.table_name}' AND xtype='U')
    CREATE TABLE ${quoteIdent("sqlserver", table.table_name)} (${columnsDDL});`;

  try {
    await executeSqlServerQuery(pool, createSql);
    console.info(
      `✅ Successfully created sql server table: ${table.table_name} with ${table.column_types.length} columns`,
    );
  } catch (error) {
    console.error(`❌ Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}

export async function setRelationsSqlServer(
  pool: SqlServerPool,
  baseTableName: string,
  relations: MappedRelation[] | null,
): Promise<void> {
  if (!relations || relations.length === 0) return;

  for (const rel of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = rel;
    try {
      await ensureForeignTableExistsSqlServer(pool, foreignTableName);

      const constraintName = `FK_${baseColumnName}_${foreignTableName}`;

      // Check if constraint already exists
      const constraintCheck = await executeSqlServerQuery(
        pool,
        `SELECT COUNT(*) as count FROM sys.foreign_keys WHERE name = '${constraintName}'`,
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
        ALTER TABLE ${quoteIdent("sqlserver", baseTableName)}
        ADD CONSTRAINT ${quoteIdent("sqlserver", constraintName)}
        FOREIGN KEY (${quoteIdent("sqlserver", baseColumnName)})
        REFERENCES ${quoteIdent("sqlserver", foreignTableName)}(${quoteIdent(
          "sqlserver",
          foreignTableColumn,
        )})
        ON DELETE CASCADE
      `;

      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
      );
      await executeSqlServerQuery(pool, sql);
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

export async function seedTableSqlServer(
  pool: SqlServerPool,
  table: SeedTable,
): Promise<void> {
  await seedTable(pool, table, "sqlserver");
}

export async function ensureForeignTableExistsSqlServer(
  pool: SqlServerPool,
  foreignTableName: string,
): Promise<void> {
  const result = await executeSqlServerQuery(
    pool,
    `SELECT COUNT(*) as count FROM sysobjects WHERE name='${foreignTableName}' AND xtype='U'`,
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

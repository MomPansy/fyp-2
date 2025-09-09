import { HTTPException } from "hono/http-exception";
import type { OraclePool } from "../../pools.ts";
import { isCountResult, quoteIdent } from "../helpers.ts";
import { executeOracleQuery } from "../query-executors.ts";
import { seedTable } from "../generic-seeding.ts";
import type { SeedTable } from "../types.ts";
import { type MappedRelation } from "server/problem-database/mappings.ts";

export async function createTableOracle(
  pool: OraclePool,
  table: SeedTable,
): Promise<void> {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`,
    });
  }
  const columnsDDL = table.column_types
    .map((col) => {
      return `${quoteIdent("oracle", col.column)} ${col.type} ${
        col.isPrimaryKey ? "PRIMARY KEY" : ""
      }`;
    })
    .join(", ");

  // Oracle doesn't have CREATE TABLE IF NOT EXISTS, so we need to check first
  const tableExistsQuery = `SELECT COUNT(*) as count FROM user_tables WHERE table_name = UPPER('${table.table_name}')`;

  try {
    const existsResult = await executeOracleQuery(pool, tableExistsQuery);
    const firstRow = existsResult.rows?.[0];
    const tableExists =
      firstRow && isCountResult(firstRow) ? firstRow.count > 0 : false;

    if (!tableExists) {
      const createSql = `CREATE TABLE ${quoteIdent(
        "oracle",
        table.table_name,
      )} (${columnsDDL})`;
      await executeOracleQuery(pool, createSql);
      console.info(
        `✅ Successfully created oracle table: ${table.table_name} with ${table.column_types.length} columns`,
      );
    } else {
      console.info(`✅ Table ${table.table_name} already exists in Oracle`);
    }
  } catch (error) {
    console.error(`❌ Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}

export async function setRelationsOracle(
  pool: OraclePool,
  baseTableName: string,
  relations: MappedRelation[] | null,
): Promise<void> {
  if (!relations || relations.length === 0) return;

  for (const rel of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = rel;
    try {
      await ensureForeignTableExistsOracle(pool, foreignTableName);

      const constraintName =
        `FK_${baseColumnName}_${foreignTableName}`.toUpperCase();

      // Check if constraint already exists
      const constraintCheck = await executeOracleQuery(
        pool,
        `SELECT COUNT(*) as count FROM user_constraints WHERE constraint_name = '${constraintName}' AND constraint_type = 'R'`,
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
        ALTER TABLE ${quoteIdent("oracle", baseTableName)}
        ADD CONSTRAINT ${quoteIdent("oracle", constraintName)}
        FOREIGN KEY (${quoteIdent("oracle", baseColumnName)})
        REFERENCES ${quoteIdent("oracle", foreignTableName)}(${quoteIdent(
          "oracle",
          foreignTableColumn,
        )})
        ON DELETE CASCADE
      `;

      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
      );
      await executeOracleQuery(pool, sql);
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

export async function seedTableOracle(
  pool: OraclePool,
  table: SeedTable,
): Promise<void> {
  await seedTable(pool, table, "oracle");
}

export async function ensureForeignTableExistsOracle(
  pool: OraclePool,
  foreignTableName: string,
): Promise<void> {
  const result = await executeOracleQuery(
    pool,
    `SELECT COUNT(*) as count FROM user_tables WHERE table_name = UPPER('${foreignTableName}')`,
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

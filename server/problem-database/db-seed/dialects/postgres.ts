import { HTTPException } from "hono/http-exception";
import type { PostgresPool } from "../../pools.ts";
import { isExistsResult, quoteIdent } from "../helpers.ts";
import { seedTable } from "../generic-seeding.ts";
import type { SeedTable } from "../types.ts";
import {
  getSqlType,
  type MappedRelation,
} from "server/problem-database/mappings.ts";

export async function createTablePostgres(
  pool: PostgresPool,
  table: SeedTable,
): Promise<void> {
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`,
    });
  }

  const columnsDDL = table.column_types
    .map((col) => {
      return `${col.column} ${getSqlType("postgres", col.type)} ${
        col.isPrimaryKey ? "PRIMARY KEY" : ""
      }`;
    })
    .join(", ");

  const createSql = `CREATE TABLE IF NOT EXISTS ${quoteIdent(
    "postgres",
    table.table_name,
  )} (${columnsDDL});`;

  try {
    await pool.query(createSql);
    console.info(
      `✅ Successfully created postgres table: ${table.table_name} with ${table.column_types.length} columns`,
    );
  } catch (error) {
    console.error(`❌ Failed to create table ${table.table_name}:`, error);
    throw error;
  }
}

export async function setRelationsPostgres(
  pool: PostgresPool,
  baseTableName: string,
  relations: MappedRelation[] | null,
): Promise<void> {
  if (!relations || relations.length === 0) return;

  for (const rel of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = rel;
    try {
      // ensure foreign table exists
      await ensureForeignTableExistsPostgres(pool, foreignTableName);

      const constraintName = `fk_${baseColumnName}_${foreignTableName}`;
      const constraintCheck = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = $1 AND constraint_name = $2 AND constraint_type = 
            'FOREIGN KEY'
        ) AS exists`,
        [baseTableName, constraintName],
      );

      const firstRow = constraintCheck.rows[0] as unknown;
      const constraintExists =
        firstRow && isExistsResult(firstRow) ? firstRow.exists : false;
      if (constraintExists) {
        console.info(
          `Constraint ${constraintName} already exists on ${baseTableName}, skipping`,
        );
        continue;
      }

      const sql = `
        ALTER TABLE ${quoteIdent("postgres", baseTableName)}
        ADD CONSTRAINT ${quoteIdent("postgres", constraintName)}
        FOREIGN KEY (${quoteIdent("postgres", baseColumnName)})
        REFERENCES ${quoteIdent("postgres", foreignTableName)}(${quoteIdent(
          "postgres",
          foreignTableColumn,
        )});
        ON DELETE CASCADE
      `;

      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
      );
      await pool.query(sql);
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

export async function seedTablePostgres(
  pool: PostgresPool,
  table: SeedTable,
): Promise<void> {
  await seedTable(pool, table, "postgres");
}

export async function ensureForeignTableExistsPostgres(
  pool: PostgresPool,
  foreignTableName: string,
): Promise<void> {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = $1
    ) as exists`,
    [foreignTableName],
  );

  const firstRow = result.rows[0] as unknown;
  const tableExists =
    firstRow && isExistsResult(firstRow) ? firstRow.exists : false;
  if (!tableExists) {
    throw new HTTPException(400, {
      message: `Foreign table '${foreignTableName}' does not exist`,
    });
  }
}

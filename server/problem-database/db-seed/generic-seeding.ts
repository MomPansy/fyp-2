/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { HTTPException } from "hono/http-exception";
import { downloadAndParseCsvSafe } from "../csv-storage.ts";
import type {
  DatabasePool,
  MysqlPool,
  OraclePool,
  PostgresPool,
  SqlitePool,
  SqlServerPool,
} from "../pools.ts";
import {
  isBooleanType,
  isNumericType,
  isTextType,
  quoteIdent,
} from "./helpers.ts";
import {
  executeMysqlQuery,
  executeOracleQuery,
  executePostgresQuery,
  executeSqliteQuery,
  executeSqlServerQuery,
} from "./query-executors.ts";
import type { QueryResult, SeedTable } from "./types.ts";
import { type Dialect } from "server/problem-database/mappings.ts";
import { supabase } from "server/lib/supabase.ts";

export async function seedTable(
  pool: DatabasePool,
  table: SeedTable,
  dialect: Dialect,
): Promise<void> {
  if (!table.data_path) {
    console.error(
      `❌ No data path specified for table ${table.table_name}, skipping data seeding`,
    );
    return;
  }

  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`,
    });
  }

  console.info(
    `📁 Downloading CSV data for table: ${table.table_name} from ${table.data_path}`,
  );
  const csvResult = await downloadAndParseCsvSafe(
    supabase,
    "tables",
    table.data_path,
    { header: true, skipEmptyLines: true },
    table.table_name,
  );

  console.info(`✅ Successfully downloaded CSV for ${table.table_name}`);

  if (
    !csvResult ||
    csvResult.errors.length > 0 ||
    csvResult.data.length === 0
  ) {
    console.error(`❌ Failed to download/parse CSV for ${table.table_name}`);
    throw new HTTPException(500, {
      message: `Failed to download/parse CSV for ${table.table_name}`,
    });
  }
  const rows = csvResult.data;
  const columnTypes = table.column_types; // We know this is not null due to the check above

  console.info(`Seeding ${rows.length} rows into ${table.table_name}...`);

  const chunkSize = 500;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const chunkValues: string[] = [];
    for (const row of chunk) {
      const rowValues: string[] = [];
      Object.values(row).forEach((value, index) => {
        if (value === null || value === undefined) {
          rowValues.push("NULL");
          return;
        }

        const colType = columnTypes[index].type;
        if (isTextType(colType)) {
          // Escape single quotes to prevent SQL injection
          const escapedValue = String(value).replace(/'/g, "''");
          rowValues.push(`'${escapedValue}'`);
        } else if (isBooleanType(colType)) {
          const boolValue = value ? "1" : "0";
          rowValues.push(
            dialect === "postgres" ? (value ? "TRUE" : "FALSE") : boolValue,
          );
        } else if (isNumericType(colType)) {
          rowValues.push(String(value));
        } else {
          // Default to text handling for unknown types
          const escapedValue = String(value).replace(/'/g, "''");
          rowValues.push(`'${escapedValue}'`);
        }
      });
      chunkValues.push(`(${rowValues.join(", ")})`);
    }

    try {
      const columnNames = columnTypes
        .map((col) => quoteIdent(dialect, col.column))
        .join(", ");

      // Build dialect-specific INSERT statement
      let insertSql = "";
      if (dialect === "mysql") {
        insertSql = `
          INSERT IGNORE INTO ${quoteIdent(
            dialect,
            table.table_name,
          )} (${columnNames})
          VALUES ${chunkValues.join(", ")}
        `;
      } else if (dialect === "sqlite") {
        insertSql = `
          INSERT OR IGNORE INTO ${quoteIdent(
            dialect,
            table.table_name,
          )} (${columnNames})
          VALUES ${chunkValues.join(", ")}
        `;
      } else if (dialect === "sqlserver") {
        insertSql = `
          INSERT INTO ${quoteIdent(dialect, table.table_name)} (${columnNames})
          VALUES ${chunkValues.join(", ")}
        `;
      } else if (dialect === "oracle") {
        // Oracle doesn't have a direct equivalent to ON CONFLICT DO NOTHING
        // We'll use INSERT ALL ... SELECT FROM dual approach for multiple rows
        const insertAllStatements = chunkValues
          .map(
            (values) =>
              `INTO ${quoteIdent(
                dialect,
                table.table_name,
              )} (${columnNames}) VALUES ${values}`,
          )
          .join(" ");
        insertSql = `INSERT ALL ${insertAllStatements} SELECT * FROM dual`;
      } else {
        // Default to PostgreSQL syntax
        insertSql = `
          INSERT INTO ${quoteIdent(dialect, table.table_name)} (${columnNames})
          VALUES ${chunkValues.join(", ")}
          ON CONFLICT DO NOTHING
        `;
      }

      console.info(
        `Inserting chunk of ${chunk.length} rows into ${table.table_name}...`,
      );

      let result: QueryResult;
      if (dialect === "postgres") {
        result = await executePostgresQuery(pool as PostgresPool, insertSql);
      } else if (dialect === "mysql") {
        result = await executeMysqlQuery(pool as MysqlPool, insertSql);
      } else if (dialect === "sqlite") {
        result = await executeSqliteQuery(pool as SqlitePool, insertSql);
      } else if (dialect === "sqlserver") {
        result = await executeSqlServerQuery(pool as SqlServerPool, insertSql);
      } else if (dialect === "oracle") {
        result = await executeOracleQuery(pool as OraclePool, insertSql);
      } else {
        throw new HTTPException(400, {
          message: `Unsupported dialect: ${dialect}`,
        });
      }

      const insertedCount =
        result.rowCount ?? result.affectedRows ?? chunk.length;
      totalInserted += insertedCount;
      console.info(
        `✅ Inserted ${insertedCount} rows into ${table.table_name} (Total so far: ${totalInserted})`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to insert rows into ${table.table_name}:`,
        error,
      );
      throw new HTTPException(500, {
        message: `Failed to insert rows into ${table.table_name}`,
      });
    }
  }

  console.info(
    `🎉 Completed seeding table ${table.table_name}. Total rows inserted: ${totalInserted}`,
  );
}

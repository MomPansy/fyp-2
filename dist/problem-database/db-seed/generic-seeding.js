import { HTTPException } from "hono/http-exception";
import { downloadAndParseCsvSafe } from "../csv-storage.js";
import {
  isBooleanType,
  isNumericType,
  isTextType,
  quoteIdent
} from "./helpers.js";
import {
  executeMysqlQuery,
  executeOracleQuery,
  executePostgresQuery,
  executeSqliteQuery,
  executeSqlServerQuery
} from "./query-executors.js";
import { getSqlType } from "../mappings.js";
import { supabase } from "../../lib/supabase.js";
async function seedTable(pool, table, dialect) {
  if (!table.data_path) {
    console.error(
      `\u274C No data path specified for table ${table.table_name}, skipping data seeding`
    );
    return;
  }
  if (!table.column_types) {
    throw new HTTPException(400, {
      message: `Table ${table.table_name} has no column types defined`
    });
  }
  console.info(
    `\u{1F4C1} Downloading CSV data for table: ${table.table_name} from ${table.data_path}`
  );
  const csvResult = await downloadAndParseCsvSafe(
    supabase,
    "tables",
    table.data_path,
    { header: true, skipEmptyLines: true },
    table.table_name
  );
  console.info(`\u2705 Successfully downloaded CSV for ${table.table_name}`);
  if (!csvResult || csvResult.errors.length > 0 || csvResult.data.length === 0) {
    console.error(`\u274C Failed to download/parse CSV for ${table.table_name}`);
    throw new HTTPException(500, {
      message: `Failed to download/parse CSV for ${table.table_name}`
    });
  }
  const rows = csvResult.data;
  const columnTypes = table.column_types;
  console.info(`Seeding ${rows.length} rows into ${table.table_name}...`);
  const chunkSize = 500;
  let totalInserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const chunkValues = [];
    for (const row of chunk) {
      const rowValues = [];
      Object.values(row).forEach((value, index) => {
        if (value === null || value === void 0) {
          rowValues.push("NULL");
          return;
        }
        const colType = getSqlType(dialect, columnTypes[index].type);
        if (isTextType(colType)) {
          const escapedValue = String(value).replace(/'/g, "''");
          rowValues.push(`'${escapedValue}'`);
        } else if (isBooleanType(colType)) {
          const boolValue = value ? "1" : "0";
          rowValues.push(
            dialect === "postgres" ? value ? "TRUE" : "FALSE" : boolValue
          );
        } else if (isNumericType(colType)) {
          rowValues.push(String(value));
        } else {
          const escapedValue = String(value).replace(/'/g, "''");
          rowValues.push(`'${escapedValue}'`);
        }
      });
      chunkValues.push(`(${rowValues.join(", ")})`);
    }
    try {
      const columnNames = columnTypes.map((col) => quoteIdent(dialect, col.column)).join(", ");
      let insertSql = "";
      if (dialect === "mysql") {
        insertSql = `
          INSERT IGNORE INTO ${quoteIdent(
          dialect,
          table.table_name
        )} (${columnNames})
          VALUES ${chunkValues.join(", ")}
        `;
      } else if (dialect === "sqlite") {
        insertSql = `
          INSERT OR IGNORE INTO ${quoteIdent(
          dialect,
          table.table_name
        )} (${columnNames})
          VALUES ${chunkValues.join(", ")}
        `;
      } else if (dialect === "sqlserver") {
        insertSql = `
          INSERT INTO ${quoteIdent(dialect, table.table_name)} (${columnNames})
          VALUES ${chunkValues.join(", ")}
        `;
      } else if (dialect === "oracle") {
        const insertAllStatements = chunkValues.map(
          (values) => `INTO ${quoteIdent(
            dialect,
            table.table_name
          )} (${columnNames}) VALUES ${values}`
        ).join(" ");
        insertSql = `INSERT ALL ${insertAllStatements} SELECT * FROM dual`;
      } else {
        insertSql = `
          INSERT INTO ${quoteIdent(dialect, table.table_name)} (${columnNames})
          VALUES ${chunkValues.join(", ")}
          ON CONFLICT DO NOTHING
        `;
      }
      console.info(
        `Inserting chunk of ${chunk.length} rows into ${table.table_name}...`
      );
      let result;
      if (dialect === "postgres") {
        result = await executePostgresQuery(pool, insertSql);
      } else if (dialect === "mysql") {
        result = await executeMysqlQuery(pool, insertSql);
      } else if (dialect === "sqlite") {
        result = await executeSqliteQuery(pool, insertSql);
      } else if (dialect === "sqlserver") {
        result = await executeSqlServerQuery(pool, insertSql);
      } else if (dialect === "oracle") {
        result = await executeOracleQuery(pool, insertSql);
      } else {
        throw new HTTPException(400, {
          message: `Unsupported dialect: ${dialect}`
        });
      }
      const insertedCount = result.rowCount ?? result.affectedRows ?? chunk.length;
      totalInserted += insertedCount;
      console.info(
        `\u2705 Inserted ${insertedCount} rows into ${table.table_name} (Total so far: ${totalInserted})`
      );
    } catch (error) {
      console.error(
        `\u274C Failed to insert rows into ${table.table_name}:`,
        error
      );
      throw new HTTPException(500, {
        message: `Failed to insert rows into ${table.table_name}`
      });
    }
  }
  console.info(
    `\u{1F389} Completed seeding table ${table.table_name}. Total rows inserted: ${totalInserted}`
  );
}
export {
  seedTable
};

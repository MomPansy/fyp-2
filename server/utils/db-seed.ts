import type { Pool } from "pg";
import Papa from "papaparse";

import {
  type Dialect,
  getSqlType,
  type MappedRelation,
} from "server/utils/mappings.ts";
import type { ColumnType } from "server/drizzle/_custom.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SeedTable = {
  table_name: string;
  column_types: ColumnType[];
  data_path?: string | null;
  relations: MappedRelation[] | null;
};

export function quoteIdent(dialect: Dialect, name: string): string {
  switch (dialect) {
    case "mysql":
      return `\`${name.replace(/`/g, "``")}\``;
    case "sqlserver":
      return `[${name.replace(/\]/g, "]] ")}]`;
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

export async function createTables(
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  console.log(`🏗️ Starting table creation for ${tables.length} tables...`);

  for (const table of tables) {
    console.log(`📋 Creating table: ${table.table_name}`);
    const qi = (s: string) => quoteIdent(dialect, s);
    const columnsDDL = table.column_types
      .map((col) => `${qi(col.column)} ${getSqlType(dialect, col.type)}`)
      .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${
      qi(table.table_name)
    } (${columnsDDL});`;

    try {
      await pool.query(createSql);
      console.log(
        `✅ Successfully created table: ${table.table_name} with ${table.column_types.length} columns`,
      );
    } catch (error) {
      console.error(`❌ Failed to create table ${table.table_name}:`, error);
      throw error;
    }
  }

  console.log(`🎉 All ${tables.length} tables created successfully!`);
}

// Wait until the DB is ready to accept queries. Retries SELECT 1 until success or timeout.
export async function waitForDatabase(
  pool: Pool,
  dialect: Dialect,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const start = Date.now();

  console.log(
    `⏳ Waiting for database to be ready (timeout: ${timeoutMs}ms, interval: ${intervalMs}ms)...`,
  );

  // Simple health query per dialect (all accept SELECT 1)
  const healthQuery = "SELECT 1";

  let attempt = 0;
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    attempt++;
    try {
      await pool.query(healthQuery);
      if (attempt > 1) {
        console.log(
          `✅ Database became ready after ${attempt} attempts (${
            Date.now() - start
          }ms)`,
        );
      } else {
        console.log(`✅ Database is ready on first attempt`);
      }
      return;
    } catch (e) {
      lastErr = e;
      if (attempt % 10 === 0) { // Log every 10th attempt to avoid spam
        console.log(`🔄 Database not ready yet (attempt ${attempt})...`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  const errMsg = lastErr instanceof Error
    ? lastErr.message
    : String(lastErr ?? "unknown error");
  console.error(
    `❌ Timed out waiting for database to be ready after ${attempt} attempts: ${errMsg}`,
  );
  throw new Error(`Timed out waiting for database to be ready: ${errMsg}`);
}

export async function importCsvData(
  supabase: SupabaseClient,
  bucket: string,
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  const qi = (s: string) => quoteIdent(dialect, s);
  const tablesWithData = tables.filter((t) => t.data_path);

  console.log(
    `📊 Starting CSV data import for ${tablesWithData.length} tables (${
      tables.length - tablesWithData.length
    } tables have no data)...`,
  );

  for (const table of tables) {
    if (!table.data_path) {
      console.log(`⏭️ Skipping ${table.table_name}: no data path specified`);
      continue;
    }

    console.log(
      `📁 Downloading CSV data for table: ${table.table_name} from ${table.data_path}`,
    );

    const { data: file, error } = await supabase.storage
      .from(bucket)
      .download(table.data_path);

    if (error) {
      console.warn(
        `⚠️ Skipping data import for ${table.table_name}: ${error.message}`,
      );
      continue;
    }

    console.log(`📝 Parsing CSV data for ${table.table_name}...`);
    const csvText = await file.text();
    const parsed = Papa.parse<Record<string, string | null>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      console.warn(
        `⚠️ CSV parse warnings for ${table.table_name}:`,
        parsed.errors.map((e) => e.message).join("; "),
      );
    }

    const rows = (parsed.data || []).filter((r) =>
      r && Object.keys(r).length > 0
    );

    if (rows.length === 0) {
      console.warn(`⚠️ No valid rows found in CSV for ${table.table_name}`);
      continue;
    }

    console.log(
      `📊 Found ${rows.length} rows to import for ${table.table_name}`,
    );

    const cols = table.column_types.map((c) => c.column);
    const colIdents = cols.map(qi).join(", ");

    console.log(`🔄 Inserting data into ${table.table_name} in chunks...`);
    const chunkSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];

      chunk.forEach((row, rowIdx) => {
        const rowVals = cols.map((col) => {
          const v = (row as any)[col];
          if (v === undefined || v === null) return null;
          const s = String(v);
          if (s.trim().length === 0 || s.toLowerCase() === "null") return null;
          return s; // casted by DB types
        });
        const base = rowIdx * cols.length;
        placeholders.push(
          `(${cols.map((_, j) => `$${base + j + 1}`).join(", ")})`,
        );
        values.push(...rowVals);
      });

      const insertSql = `INSERT INTO ${
        qi(table.table_name)
      } (${colIdents}) VALUES ${placeholders.join(", ")};`;

      try {
        await pool.query(insertSql, values);
        totalInserted += chunk.length;
        console.log(
          `✅ Inserted batch ${Math.floor(i / chunkSize) + 1}/${
            Math.ceil(rows.length / chunkSize)
          } for ${table.table_name} (${chunk.length} rows)`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to insert batch for ${table.table_name}:`,
          error,
        );
        throw error;
      }
    }

    console.log(
      `🎉 Successfully imported ${totalInserted} rows into ${table.table_name}`,
    );
  }

  console.log(`📊 CSV import completed for all tables!`);
}

export async function addForeignKeys(
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  const qi = (s: string) => quoteIdent(dialect, s);
  const tablesWithRelations = tables.filter((t) =>
    t.relations && t.relations.length > 0
  );

  console.log(
    `🔗 Starting foreign key creation for ${tablesWithRelations.length} tables...`,
  );

  let totalConstraints = 0;
  let addedConstraints = 0;
  let skippedConstraints = 0;
  let failedConstraints = 0;

  for (const table of tables) {
    if (!table.relations || table.relations.length === 0) {
      console.log(
        `⏭️ Skipping ${table.table_name}: no foreign key relations defined`,
      );
      continue;
    }

    console.log(
      `🔗 Adding ${table.relations.length} foreign key(s) for table: ${table.table_name}`,
    );

    for (const rel of table.relations) {
      totalConstraints++;
      const constraintName =
        `fk_${rel.baseTableName}_${rel.baseColumnName}_${rel.foreignTableName}`;
      const fkSql = `ALTER TABLE ${qi(rel.baseTableName)} ADD CONSTRAINT ${
        qi(constraintName)
      } FOREIGN KEY (${qi(rel.baseColumnName)}) REFERENCES ${
        qi(rel.foreignTableName)
      }(${qi(rel.foreignTableColumn)});`;

      console.log(
        `🔗 Adding constraint: ${constraintName} (${rel.baseTableName}.${rel.baseColumnName} → ${rel.foreignTableName}.${rel.foreignTableColumn})`,
      );

      try {
        await pool.query(fkSql);
        addedConstraints++;
        console.log(
          `✅ Successfully added foreign key constraint: ${constraintName}`,
        );
      } catch (err: any) {
        const msg = err?.message?.toLowerCase?.() || "";
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          skippedConstraints++;
          console.log(
            `⏭️ Constraint ${constraintName} already exists, skipping`,
          );
        } else if (
          msg.includes("no unique constraint") ||
          msg.includes("unique constraint matching")
        ) {
          failedConstraints++;
          console.error(
            `❌ Foreign key constraint ${constraintName} failed: Referenced column '${rel.foreignTableColumn}' in table '${rel.foreignTableName}' must have a unique constraint or be a primary key`,
          );
          console.log(
            `💡 Suggestion: Add a unique constraint or primary key to ${rel.foreignTableName}.${rel.foreignTableColumn}, or reference a different column that is unique`,
          );
          // Don't throw here, continue with other constraints
        } else if (
          msg.includes("does not exist") ||
          msg.includes("column") && msg.includes("not found")
        ) {
          failedConstraints++;
          console.error(
            `❌ Foreign key constraint ${constraintName} failed: Column '${rel.foreignTableColumn}' does not exist in table '${rel.foreignTableName}' or column '${rel.baseColumnName}' does not exist in table '${rel.baseTableName}'`,
          );
          console.log(
            `💡 Suggestion: Check that the column names are correct and match the actual table schema`,
          );
          // Don't throw here, continue with other constraints
        } else {
          failedConstraints++;
          console.error(
            `❌ Failed to add foreign key constraint ${constraintName}:`,
            err,
          );
          console.log(`💡 SQL attempted: ${fkSql}`);
          // Don't throw here, continue with other constraints
        }
      }
    }
  }

  console.log(`🎉 Foreign key creation completed!`);
  console.log(
    `📊 Summary: ${addedConstraints} added, ${skippedConstraints} skipped, ${failedConstraints} failed, ${totalConstraints} total`,
  );

  if (failedConstraints > 0) {
    console.warn(
      `⚠️ ${failedConstraints} foreign key constraint(s) failed. Check the logs above for details and suggestions.`,
    );
    console.log(`💡 Common solutions:`);
    console.log(
      `   • Add PRIMARY KEY or UNIQUE constraint to referenced columns`,
    );
    console.log(`   • Verify column names match the actual table schema`);
    console.log(
      `   • Ensure referenced tables exist before creating foreign keys`,
    );
  }
}

export async function validateForeignKeyConstraints(
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  console.log(`🔍 Validating foreign key constraints before creation...`);

  const qi = (s: string) => quoteIdent(dialect, s);
  let validationErrors = 0;

  for (const table of tables) {
    if (!table.relations || table.relations.length === 0) continue;

    for (const rel of table.relations) {
      // Check if referenced table exists and has the column with appropriate constraints
      try {
        // Query to check if the referenced column has a unique constraint or is a primary key
        const checkConstraintSql = `
          SELECT 
            tc.constraint_type,
            kcu.column_name
          FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
          WHERE 
            tc.table_name = $1 
            AND kcu.column_name = $2
            AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        `;

        const result = await pool.query(checkConstraintSql, [
          rel.foreignTableName,
          rel.foreignTableColumn,
        ]);

        if (result.rows.length === 0) {
          validationErrors++;
          console.warn(
            `⚠️ Validation warning: ${rel.foreignTableName}.${rel.foreignTableColumn} has no unique constraint or primary key`,
          );
          console.log(
            `   Foreign key ${rel.baseTableName}.${rel.baseColumnName} → ${rel.foreignTableName}.${rel.foreignTableColumn} will likely fail`,
          );
        } else {
          console.log(
            `✅ Validation passed: ${rel.foreignTableName}.${rel.foreignTableColumn} has ${
              result.rows[0].constraint_type
            }`,
          );
        }
      } catch (error) {
        validationErrors++;
        console.warn(
          `⚠️ Could not validate constraint for ${rel.foreignTableName}.${rel.foreignTableColumn}:`,
          error,
        );
      }
    }
  }

  if (validationErrors > 0) {
    console.warn(
      `⚠️ Found ${validationErrors} potential foreign key issues. Proceeding anyway, but some constraints may fail.`,
    );
  } else {
    console.log(`✅ All foreign key validations passed!`);
  }
}

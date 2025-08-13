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
      console.log(`✅ Successfully created table: ${table.table_name} with ${table.column_types.length} columns`);
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

  console.log(`⏳ Waiting for database to be ready (timeout: ${timeoutMs}ms, interval: ${intervalMs}ms)...`);

  // Simple health query per dialect (all accept SELECT 1)
  const healthQuery = "SELECT 1";

  let attempt = 0;
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    attempt++;
    try {
      await pool.query(healthQuery);
      if (attempt > 1) {
        console.log(`✅ Database became ready after ${attempt} attempts (${Date.now() - start}ms)`);
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
  const errMsg =
    lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown error");
  console.error(`❌ Timed out waiting for database to be ready after ${attempt} attempts: ${errMsg}`);
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
  const tablesWithData = tables.filter(t => t.data_path);
  
  console.log(`📊 Starting CSV data import for ${tablesWithData.length} tables (${tables.length - tablesWithData.length} tables have no data)...`);

  for (const table of tables) {
    if (!table.data_path) {
      console.log(`⏭️ Skipping ${table.table_name}: no data path specified`);
      continue;
    }

    console.log(`📁 Downloading CSV data for table: ${table.table_name} from ${table.data_path}`);

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

    console.log(`📊 Found ${rows.length} rows to import for ${table.table_name}`);

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
        console.log(`✅ Inserted batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(rows.length / chunkSize)} for ${table.table_name} (${chunk.length} rows)`);
      } catch (error) {
        console.error(`❌ Failed to insert batch for ${table.table_name}:`, error);
        throw error;
      }
    }
    
    console.log(`🎉 Successfully imported ${totalInserted} rows into ${table.table_name}`);
  }
  
  console.log(`📊 CSV import completed for all tables!`);
}

export async function addForeignKeys(
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  const qi = (s: string) => quoteIdent(dialect, s);
  const tablesWithRelations = tables.filter(t => t.relations && t.relations.length > 0);
  
  console.log(`🔗 Starting foreign key creation for ${tablesWithRelations.length} tables...`);

  let totalConstraints = 0;
  let addedConstraints = 0;
  let skippedConstraints = 0;

  for (const table of tables) {
    if (!table.relations || table.relations.length === 0) {
      console.log(`⏭️ Skipping ${table.table_name}: no foreign key relations defined`);
      continue;
    }
    
    console.log(`🔗 Adding ${table.relations.length} foreign key(s) for table: ${table.table_name}`);
    
    for (const rel of table.relations) {
      totalConstraints++;
      const constraintName =
        `fk_${rel.baseTableName}_${rel.baseColumnName}_${rel.foreignTableName}`;
      const fkSql = `ALTER TABLE ${qi(rel.baseTableName)} ADD CONSTRAINT ${
        qi(constraintName)
      } FOREIGN KEY (${qi(rel.baseColumnName)}) REFERENCES ${
        qi(rel.foreignTableName)
      }(${qi(rel.foreignTableColumn)});`;
      
      console.log(`🔗 Adding constraint: ${constraintName} (${rel.baseTableName}.${rel.baseColumnName} → ${rel.foreignTableName}.${rel.foreignTableColumn})`);
      
      try {
        await pool.query(fkSql);
        addedConstraints++;
        console.log(`✅ Successfully added foreign key constraint: ${constraintName}`);
      } catch (err: any) {
        const msg = err?.message?.toLowerCase?.() || "";
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          console.error(`❌ Failed to add foreign key constraint ${constraintName}:`, err);
          throw err;
        } else {
          skippedConstraints++;
          console.log(`⏭️ Constraint ${constraintName} already exists, skipping`);
        }
      }
    }
  }
  
  console.log(`🎉 Foreign key creation completed!`);
  console.log(`📊 Summary: ${addedConstraints} added, ${skippedConstraints} skipped, ${totalConstraints} total`);
}

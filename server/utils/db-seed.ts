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
      return `[${name.replace(/\]/g, "]]")}]`;
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

export async function createTables(
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  for (const table of tables) {
    const qi = (s: string) => quoteIdent(dialect, s);
    const columnsDDL = table.column_types
      .map((col) => `${qi(col.column)} ${getSqlType(dialect, col.type)}`)
      .join(", ");

    const createSql = `CREATE TABLE IF NOT EXISTS ${
      qi(table.table_name)
    } (${columnsDDL});`;
    await pool.query(createSql);
  }
}

export async function importCsvData(
  supabase: SupabaseClient,
  bucket: string,
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  const qi = (s: string) => quoteIdent(dialect, s);

  for (const table of tables) {
    if (!table.data_path) continue;

    const { data: file, error } = await supabase.storage
      .from(bucket)
      .download(table.data_path);

    if (error) {
      console.warn(
        `⚠️ Skipping data import for ${table.table_name}: ${error.message}`,
      );
      continue;
    }

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
    if (rows.length === 0) continue;

    const cols = table.column_types.map((c) => c.column);
    const colIdents = cols.map(qi).join(", ");

    const chunkSize = 500;
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
      await pool.query(insertSql, values);
    }
  }
}

export async function addForeignKeys(
  pool: Pool,
  tables: SeedTable[],
  dialect: Dialect,
): Promise<void> {
  const qi = (s: string) => quoteIdent(dialect, s);

  for (const table of tables) {
    if (!table.relations || table.relations.length === 0) continue;
    for (const rel of table.relations) {
      const constraintName =
        `fk_${rel.baseTableName}_${rel.baseColumnName}_${rel.foreignTableName}`;
      const fkSql = `ALTER TABLE ${qi(rel.baseTableName)} ADD CONSTRAINT ${
        qi(constraintName)
      } FOREIGN KEY (${qi(rel.baseColumnName)}) REFERENCES ${
        qi(rel.foreignTableName)
      }(${qi(rel.foreignTableColumn)});`;
      try {
        await pool.query(fkSql);
      } catch (err: any) {
        const msg = err?.message?.toLowerCase?.() || "";
        if (!msg.includes("already exists") && !msg.includes("duplicate")) {
          throw err;
        }
      }
    }
  }
}

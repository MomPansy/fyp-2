/* eslint-disable @typescript-eslint/no-base-to-string */
import { PGliteWithLive } from "@electric-sql/pglite/live";
import { Row } from "./csv-import.store.ts";
import { getSqlType } from "server/problem-database/mappings.ts";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";
import { showErrorNotification } from "@/components/notifications.ts";
import { supabase } from "@/lib/supabase.ts";
import { TableMetadata } from "@/hooks/use-problem.ts";

/**
 * Sorts tables by their dependencies so tables with no foreign keys are created first
 */
export function sortTablesByDependencies(
  tablesMetadata: TableMetadata[],
): TableMetadata[] {
  const sorted: TableMetadata[] = [];
  const remaining = [...tablesMetadata];
  const tableNames = new Set(tablesMetadata.map((t) => t.tableName));

  while (remaining.length > 0) {
    const beforeLength = remaining.length;

    // Find tables that can be created (no unresolved dependencies)
    for (let i = remaining.length - 1; i >= 0; i--) {
      const table = remaining[i];
      const hasUnresolvedDependencies = table.relations.some((relation) => {
        // Check if the foreign table is in our set and not yet created
        return (
          tableNames.has(relation.foreignTableName) &&
          !sorted.some((t) => t.tableName === relation.foreignTableName)
        );
      });

      if (!hasUnresolvedDependencies) {
        sorted.push(table);
        remaining.splice(i, 1);
      }
    }

    // If no progress was made, we have circular dependencies or missing tables
    if (remaining.length === beforeLength) {
      console.warn(
        "⚠️ Circular dependencies detected or missing foreign tables. Creating remaining tables in original order.",
      );
      sorted.push(...remaining);
      break;
    }
  }

  return sorted;
}

/**
 * Drops all existing tables in the database
 * This is useful when you need to reset the schema completely
 * @param db - PGlite database instance
 * @param tableNames - Optional array of specific table names to drop. If not provided, drops all tables
 */
export async function dropAllTables(db: PGliteWithLive, tableNames?: string[]) {
  try {
    console.info("🗑️ Dropping tables...");

    const normalize = (n: string) =>
      n.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

    // Get list of tables to drop
    let tablesToDrop: string[];
    if (tableNames && tableNames.length > 0) {
      tablesToDrop = tableNames.map(normalize);
    } else {
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      tablesToDrop = result.rows.map((row: unknown) =>
        normalize((row as { table_name: string }).table_name),
      );
    }

    // Deduplicate
    tablesToDrop = Array.from(new Set(tablesToDrop));

    if (tablesToDrop.length === 0) {
      console.info("✅ No tables to drop");
      return;
    }

    console.info(`📋 Tables to drop (normalized): ${tablesToDrop.join(", ")}`);

    // Build individual statements (pglite may not support multi‑statement with semicolons reliably)
    const dropped: string[] = [];
    for (const t of tablesToDrop) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
        // verify
        const existsCheck = await db.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`,
          [t],
        );
        const stillExists = (existsCheck.rows[0] as { exists: boolean }).exists;
        if (stillExists) {
          console.warn(
            `⚠️ Table '${t}' still exists after DROP attempt (case / quoting mismatch?)`,
          );
        } else {
          console.info(`✅ Dropped table: ${t}`);
          dropped.push(t);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to drop table '${t}':`, err);
      }
    }

    // Final report
    const remaining = tablesToDrop.filter((t) => !dropped.includes(t));
    if (remaining.length) {
      console.warn(`⚠️ Remaining tables not dropped: ${remaining.join(", ")}`);
    } else {
      console.info(
        `✅ Successfully dropped all ${String(dropped.length)} requested tables`,
      );
    }

    return { droppedTables: dropped, remainingTables: remaining };
  } catch (error) {
    console.error("❌ Failed to drop tables:", error);
    showErrorNotification({
      title: "Failed to drop tables",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Failed to drop tables");
  }
}

export async function createTablesColumns(
  db: PGliteWithLive,
  baseTableName: string,
  baseTableColumns: ColumnType[],
) {
  // Check if table already exists
  try {
    const result = await db.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = $1
      ) AS exists`,
      [baseTableName],
    );

    const tableExists = (result.rows[0] as { exists: boolean }).exists;
    if (tableExists) {
      console.info(
        `✅ Table '${baseTableName}' already exists, skipping creation`,
      );
      return;
    }
  } catch (error) {
    console.warn(
      `⚠️ Could not check if table '${baseTableName}' exists, proceeding with creation:`,
      error,
    );
  }

  const columnsDDL = baseTableColumns
    .map(
      (col) =>
        `${col.column} ${getSqlType("postgres", col.type)} ${
          col.isPrimaryKey ? "PRIMARY KEY" : ""
        }`,
    )
    .join(", ");

  const createSql = `CREATE TABLE ${baseTableName} (${columnsDDL});`;

  try {
    console.info(`Creating table '${baseTableName}' with SQL:`, createSql);
    await db.query(createSql);
    console.info(`✅ Successfully created table: ${baseTableName}`);
  } catch (error) {
    console.error(`❌ Failed to create table '${baseTableName}':`, error);
    showErrorNotification({
      title: `Failed to create table '${baseTableName}'`,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error(`Failed to create table '${baseTableName}'`);
  }
}

export async function seedTableData(
  db: PGliteWithLive,
  baseTableName: string,
  filteredData: Row[],
  baseTableColumns: ColumnType[],
) {
  const length = filteredData.length;
  if (length === 0) {
    console.warn("No data to insert, skipping seeding");
    return;
  }

  const chunkSize = 500;
  let totalInserted = 0;

  for (let i = 0; i < length; i += chunkSize) {
    const chunk = filteredData.slice(i, i + chunkSize);
    const chunkValues: string[] = [];

    for (const row of chunk) {
      const rowValues: string[] = [];
      Object.values(row).forEach((value, index) => {
        // Handle null/undefined values
        if (value === null || value === undefined) {
          rowValues.push("NULL");
          return;
        }

        const colType = getSqlType("postgres", baseTableColumns[index].type);

        if (colType === "TEXT") {
          // Escape single quotes to prevent SQL injection
          const escapedValue = String(value).replace(/'/g, "''");
          rowValues.push(`'${escapedValue}'`);
        } else if (colType === "BOOLEAN") {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          rowValues.push(value ? "TRUE" : "FALSE");
        } else if (colType === "INTEGER" || colType === "NUMERIC") {
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
      const columnNames = baseTableColumns.map((col) => col.column).join(", ");
      const insertSql = `INSERT INTO ${baseTableName} (${columnNames}) VALUES ${chunkValues.join(
        ", ",
      )}`;

      console.info(`Inserting chunk of ${chunk.length} rows...`);
      await db.query(insertSql);
      totalInserted += chunk.length;
    } catch (error) {
      console.error(`❌ Failed to insert chunk starting at row ${i}:`, error);
      showErrorNotification({
        title: "Failed to insert data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(`Failed to insert data at chunk ${i}`);
    }
  }

  console.info(
    `✅ Successfully inserted ${totalInserted} rows into ${baseTableName}`,
  );
}

async function ensureForeignTableExists(
  db: PGliteWithLive,
  foreignTableName: string,
): Promise<void> {
  // Check if foreign table exists in the database
  const result = await db.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = $1
    ) AS exists`,
    [foreignTableName],
  );

  const tableExists = (result.rows[0] as { exists: boolean }).exists;
  if (tableExists) {
    return; // Table already exists
  }

  // Table doesn't exist, try to create it from Supabase metadata
  const { data: foreignTable, error } = await supabase
    .from("problem_tables")
    .select("table_name, column_types")
    .eq("table_name", foreignTableName)
    .single();

  if (error) {
    throw new Error(
      `Foreign table '${foreignTableName}' not found in database or metadata`,
    );
  }

  // Create the foreign table
  const foreignColumnTypes =
    foreignTable.column_types as unknown as ColumnType[];
  await createTablesColumns(db, foreignTableName, foreignColumnTypes);

  console.info(`✅ Created foreign table: ${foreignTableName}`);
}

export async function setRelations(
  db: PGliteWithLive,
  baseTableName: string,
  relations: ForeignKeyMapping[],
) {
  if (relations.length === 0) {
    console.warn("No relations to set, skipping");
    return;
  }

  const errors: string[] = [];

  for (const relation of relations) {
    const { baseColumnName, foreignTableName, foreignTableColumn } = relation;

    try {
      // Ensure foreign table exists
      await ensureForeignTableExists(db, foreignTableName);

      // Check if constraint already exists
      const constraintName = `fk_${baseColumnName}_${foreignTableName}`;
      const constraintCheck = await db.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = $1 AND constraint_name = $2 AND constraint_type = 'FOREIGN KEY'
        ) AS exists`,
        [baseTableName, constraintName],
      );

      const constraintExists = (constraintCheck.rows[0] as { exists: boolean })
        .exists;
      if (constraintExists) {
        console.info(
          `✅ Foreign key constraint '${constraintName}' already exists, skipping`,
        );
        continue;
      }

      // Create foreign key constraint
      const sql = `
        ALTER TABLE ${baseTableName}
        ADD CONSTRAINT ${constraintName}
        FOREIGN KEY (${baseColumnName})
        REFERENCES ${foreignTableName}(${foreignTableColumn})
        ON DELETE CASCADE;
      `;

      console.info(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
      );
      await db.query(sql);
      console.info(
        `✅ Successfully created foreign key constraint: ${constraintName}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check if error is about constraint already existing (fallback check)
      if (errorMessage.includes("already exists")) {
        console.info(
          `✅ Foreign key constraint already exists, skipping: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
        );
        continue;
      }

      const relationError = `Failed to set relation ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}: ${errorMessage}`;

      console.error(`❌ ${relationError}`);
      errors.push(relationError);
    }
  }

  // Handle accumulated errors
  if (errors.length > 0) {
    const errorMessage =
      errors.length === 1
        ? errors[0]
        : `Failed to set ${errors.length} relation(s):\n${errors
            .map((err) => `• ${err}`)
            .join("\n")}`;

    showErrorNotification({
      title: "Relation Setup Failed",
      message: errorMessage,
    });

    throw new Error(`Failed to set ${errors.length} relation(s)`);
  }

  console.info(
    `✅ Successfully set ${relations.length} relation(s) for table: ${baseTableName}`,
  );
}

import { PGliteWithLive } from "@electric-sql/pglite/live";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom";
import { showErrorNotification } from "@/components/notifications";
import { getSqlType } from "server/utils/mappings.ts";
import { Row } from "./csv-import.store";
import { supabase } from "@/lib/supabase";

export async function createTablesColumns(
  db: PGliteWithLive,
  baseTableName: string,
  baseTableColumns: ColumnType[],
) {
  const columnsDDL = baseTableColumns
    .map((col) =>
      `${col.column} ${getSqlType("postgres", col.type)} ${
        col.isPrimaryKey ? "PRIMARY KEY" : ""
      }`
    )
    .join(", ");

  const createSql =
    `CREATE TABLE IF NOT EXISTS ${baseTableName} (${columnsDDL});`;
  try {
    console.log("Creating tables with SQL:", createSql);
    await db.query(createSql);
  } catch (error) {
    console.error("❌ Failed to create tables:", error);
    showErrorNotification({
      title: "Failed to create tables",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error("Failed to create tables");
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
        if (colType === "text") {
          // Escape single quotes to prevent SQL injection
          const escapedValue = String(value).replace(/'/g, "''");
          rowValues.push(`'${escapedValue}'`);
        } else if (colType === "boolean") {
          rowValues.push(value ? "TRUE" : "FALSE");
        } else if (colType === "integer" || colType === "real") {
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
      const insertSql = `INSERT INTO ${baseTableName} (${columnNames}) VALUES ${
        chunkValues.join(", ")
      }`;

      console.log(`Inserting chunk of ${chunk.length} rows...`);
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

  console.log(
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

  const tableExists = (result.rows[0] as { exists: boolean })?.exists;
  if (tableExists) {
    return; // Table already exists
  }

  // Table doesn't exist, try to create it from Supabase metadata
  const { data: foreignTable, error } = await supabase
    .from("problem_tables")
    .select("table_name, column_types")
    .eq("table_name", foreignTableName)
    .single();

  if (error || !foreignTable) {
    throw new Error(
      `Foreign table '${foreignTableName}' not found in database or metadata`,
    );
  }

  // Create the foreign table
  const foreignColumnTypes = foreignTable.column_types as ColumnType[];
  await createTablesColumns(db, foreignTableName, foreignColumnTypes);

  console.log(`✅ Created foreign table: ${foreignTableName}`);
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

      // Create foreign key constraint
      const sql = `
        ALTER TABLE ${baseTableName}
        ADD CONSTRAINT fk_${baseColumnName}_${foreignTableName}
        FOREIGN KEY (${baseColumnName})
        REFERENCES ${foreignTableName}(${foreignTableColumn})
        ON DELETE CASCADE;
      `;

      console.log(
        `Setting relation: ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}`,
      );
      await db.query(sql);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      const relationError =
        `Failed to set relation ${baseTableName}.${baseColumnName} -> ${foreignTableName}.${foreignTableColumn}: ${errorMessage}`;

      console.error(`❌ ${relationError}`);
      errors.push(relationError);
    }
  }

  // Handle accumulated errors
  if (errors.length > 0) {
    const errorMessage = errors.length === 1
      ? errors[0]
      : `Failed to set ${errors.length} relation(s):\n${
        errors.map((err) => `• ${err}`).join("\n")
      }`;

    showErrorNotification({
      title: "Relation Setup Failed",
      message: errorMessage,
    });

    throw new Error(`Failed to set ${errors.length} relation(s)`);
  }

  console.log(
    `✅ Successfully set ${relations.length} relation(s) for table: ${baseTableName}`,
  );
}

// type TableInfo = {
//   table_name: string;
//   data_path: string;
//   column_types: ColumnType[];
//   relations: ForeignKeyMapping[];
// }

// async function seedDatabase(db: PGliteWithLive, problem_id: string) {
//   // fetch all tables for this problem
//   const { data: tables, error } = await supabase
//     .from("problem_tables")
//     .select("table_name, data_path, column_types, relations")
//     .eq("problem_id", problem_id);

//   if (error) {
//     throw new Error("Failed to fetch problem tables");
//   }
// }

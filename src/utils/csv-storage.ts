import Papa from "papaparse";
import { supabase } from "@/lib/supabase.ts";

export interface CsvParseOptions {
  header?: boolean;
  skipEmptyLines?: boolean;
  dynamicTyping?: boolean;
  delimiter?: string;
  encoding?: string;
}

export interface CsvDownloadResult<T = Record<string, unknown>> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * Downloads a CSV file from Supabase Storage and parses it
 * @param bucket - The storage bucket name (default: "tables")
 * @param filePath - The path to the file in the bucket
 * @param options - Papa Parse options
 * @returns Parsed CSV data with errors and metadata
 */
export async function downloadAndParseCsv<T = Record<string, unknown>>(
  filePath: string,
  bucket = "tables",
  options: CsvParseOptions = {},
): Promise<CsvDownloadResult<T>> {
  const defaultOptions: CsvParseOptions = {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    ...options,
  };

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (downloadError) {
    throw new Error(
      `Failed to download CSV file from ${bucket}/${filePath}: ${
        downloadError.message || "No data returned"
      }`,
    );
  }

  // Convert file to text
  const csvText = await fileData.text();

  // Parse CSV with Papa Parse
  const parsed = Papa.parse<T>(csvText, defaultOptions);

  // Filter out empty rows
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredData = (parsed.data || []).filter((row): row is T => {
    return !!row && typeof row === "object" && Object.keys(row).length > 0;
  });

  return {
    data: filteredData,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    errors: parsed.errors || [],
    meta: parsed.meta,
  };
}

/**
 * Downloads and parses a CSV file, with error handling and logging
 * @param filePath - The path to the file in the bucket
 * @param bucket - The storage bucket name (default: "tables")
 * @param options - Papa Parse options
 * @param tableName - Optional table name for logging context
 * @returns Parsed CSV data or null if failed
 */
export async function downloadAndParseCsvSafe<T = Record<string, unknown>>(
  filePath: string,
  bucket = "tables",
  options: CsvParseOptions = {},
  tableName?: string,
): Promise<CsvDownloadResult<T> | null> {
  try {
    const result = await downloadAndParseCsv<T>(filePath, bucket, options);

    // Log parse warnings if any
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(", ");
      const context = tableName ? ` for table ${tableName}` : "";
      console.warn(`CSV parse warnings${context}:`, errorMessages);
    }

    return result;
  } catch (error) {
    const context = tableName ? ` for table ${tableName}` : "";
    console.error(`Error downloading/parsing CSV${context}:`, error);
    return null;
  }
}

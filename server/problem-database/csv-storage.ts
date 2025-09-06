/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import Papa from "papaparse";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 * Downloads a CSV file from Supabase Storage and parses it (server-side version)
 * @param supabase - Supabase client instance
 * @param bucket - The storage bucket name
 * @param filePath - The path to the file in the bucket
 * @param options - Papa Parse options
 * @returns Parsed CSV data with errors and metadata
 */
export async function downloadAndParseCsv<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  bucket: string,
  filePath: string,
  options: CsvParseOptions = {},
): Promise<CsvDownloadResult<T>> {
  const defaultOptions: CsvParseOptions = {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Server-side might want more control over types
    ...options,
  };

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(
      `Failed to download CSV file from ${bucket}/${filePath}: ${
        downloadError?.message || "No data returned"
      }`,
    );
  }

  // Convert file to text
  const csvText = await fileData.text();

  // Parse CSV with Papa Parse
  const parsed = Papa.parse<T>(csvText, defaultOptions);

  // Filter out empty rows
  const filteredData = (parsed.data || []).filter((row): row is T => {
    return !!row && typeof row === "object" && Object.keys(row).length > 0;
  });

  return {
    data: filteredData,
    errors: parsed.errors || [],
    meta: parsed.meta,
  };
}

/**
 * Downloads and parses a CSV file, with error handling and logging (server-side version)
 * @param supabase - Supabase client instance
 * @param bucket - The storage bucket name
 * @param filePath - The path to the file in the bucket
 * @param options - Papa Parse options
 * @param tableName - Optional table name for logging context
 * @returns Parsed CSV data or null if failed
 */
export async function downloadAndParseCsvSafe<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  bucket: string,
  filePath: string,
  options: CsvParseOptions = {},
  tableName?: string,
): Promise<CsvDownloadResult<T> | null> {
  try {
    const result = await downloadAndParseCsv<T>(
      supabase,
      bucket,
      filePath,
      options,
    );

    // Log parse warnings if any
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(", ");
      const context = tableName ? ` for table ${tableName}` : "";
      console.warn(`⚠️ CSV parse warnings${context}:`, errorMessages);
    }

    return result;
  } catch (error) {
    const context = tableName ? ` for table ${tableName}` : "";
    console.error(`❌ Error downloading/parsing CSV${context}:`, error);
    return null;
  }
}

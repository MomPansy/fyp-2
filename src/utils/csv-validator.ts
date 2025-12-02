import { ParseResult } from "papaparse";

export interface CsvValidationError {
  type:
    | "empty_file"
    | "no_headers"
    | "inconsistent_columns"
    | "empty_header"
    | "duplicate_header"
    | "parse_error"
    | "empty_row"
    | "missing_values";
  message: string;
  row?: number;
  column?: string;
  severity: "error" | "warning";
}

export interface CsvValidationResult {
  isValid: boolean;
  errors: CsvValidationError[];
  warnings: CsvValidationError[];
  stats: {
    totalRows: number;
    validRows: number;
    emptyRows: number;
    columnCount: number;
  };
}

/**
 * Validates a parsed CSV result from PapaParse
 */
export function validateCsv<T extends Record<string, unknown>>(
  result: ParseResult<T>,
): CsvValidationResult {
  const errors: CsvValidationError[] = [];
  const warnings: CsvValidationError[] = [];

  const headers = result.meta.fields ?? [];
  const data = result.data;

  // Check for empty file
  if (data.length === 0) {
    errors.push({
      type: "empty_file",
      message: "The CSV file is empty or contains no data rows",
      severity: "error",
    });
    return {
      isValid: false,
      errors,
      warnings,
      stats: { totalRows: 0, validRows: 0, emptyRows: 0, columnCount: 0 },
    };
  }

  // Check for headers
  if (headers.length === 0) {
    errors.push({
      type: "no_headers",
      message: "No column headers found in the CSV file",
      severity: "error",
    });
    return {
      isValid: false,
      errors,
      warnings,
      stats: {
        totalRows: data.length,
        validRows: 0,
        emptyRows: 0,
        columnCount: 0,
      },
    };
  }

  // Check for empty headers
  const emptyHeaderIndices = headers
    .map((h, i) => (h.trim() === "" ? i : -1))
    .filter((i) => i !== -1);

  if (emptyHeaderIndices.length > 0) {
    warnings.push({
      type: "empty_header",
      message: `Empty column header(s) found at position(s): ${emptyHeaderIndices.map((i) => i + 1).join(", ")}. They will be auto-named.`,
      severity: "warning",
    });
  }

  // Check for duplicate headers
  const headerCounts = new Map<string, number>();
  headers.forEach((h) => {
    const normalized = h.toLowerCase().trim();
    headerCounts.set(normalized, (headerCounts.get(normalized) ?? 0) + 1);
  });

  const duplicates = [...headerCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  if (duplicates.length > 0) {
    errors.push({
      type: "duplicate_header",
      message: `Duplicate column names found: ${duplicates.join(", ")}`,
      severity: "error",
    });
  }

  // Check PapaParse errors
  if (result.errors.length > 0) {
    result.errors.forEach((err) => {
      // Determine severity based on error type
      const isWarning =
        err.type === "FieldMismatch" || err.code === "TooFewFields";

      const validationError: CsvValidationError = {
        type: "parse_error",
        message: err.message,
        row: err.row !== undefined ? err.row + 2 : undefined, // +2 for header row and 0-index
        severity: isWarning ? "warning" : "error",
      };

      if (isWarning) {
        warnings.push(validationError);
      } else {
        errors.push(validationError);
      }
    });
  }

  // Validate row data
  let emptyRows = 0;
  let validRows = 0;

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row and 1-indexed
    const values = Object.values(row);

    // Check for completely empty rows
    const isEmpty = values.every(
      (v) =>
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim() === ""),
    );

    if (isEmpty) {
      emptyRows++;
      warnings.push({
        type: "empty_row",
        message: `Row ${rowNum} is empty`,
        row: rowNum,
        severity: "warning",
      });
    } else {
      validRows++;
    }
  });

  // Summary warning for many empty rows
  if (emptyRows > 5) {
    // Remove individual empty row warnings and add summary
    const otherWarnings = warnings.filter((w) => w.type !== "empty_row");
    warnings.length = 0;
    warnings.push(...otherWarnings);
    warnings.push({
      type: "empty_row",
      message: `${emptyRows} empty rows found and will be skipped`,
      severity: "warning",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: data.length,
      validRows,
      emptyRows,
      columnCount: headers.length,
    },
  };
}

/**
 * Format validation results for display
 */
export function formatValidationMessage(result: CsvValidationResult): string {
  const messages: string[] = [];

  if (result.errors.length > 0) {
    messages.push("Errors:");
    result.errors.forEach((e) => {
      const location = e.row ? ` (row ${e.row})` : "";
      messages.push(`  • ${e.message}${location}`);
    });
  }

  if (result.warnings.length > 0) {
    if (messages.length > 0) messages.push("");
    messages.push("Warnings:");
    result.warnings.forEach((w) => {
      const location = w.row ? ` (row ${w.row})` : "";
      messages.push(`  • ${w.message}${location}`);
    });
  }

  return messages.join("\n");
}

/**
 * Clean row data by trimming whitespace and handling empty values
 */
export function cleanRowData<T extends Record<string, unknown>>(
  data: T[],
): T[] {
  return data
    .map((row) => {
      const cleaned = {} as T;
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "string") {
          (cleaned as Record<string, unknown>)[key] = value.trim();
        } else {
          (cleaned as Record<string, unknown>)[key] = value;
        }
      }
      return cleaned;
    })
    .filter((row) => {
      // Filter out completely empty rows
      const values = Object.values(row);
      return !values.every(
        (v) =>
          v === null ||
          v === undefined ||
          (typeof v === "string" && v.trim() === ""),
      );
    });
}

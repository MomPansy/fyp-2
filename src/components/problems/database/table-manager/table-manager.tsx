import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse } from "papaparse";
import { DropCSV } from "../../dropzone.tsx";
import { Row, useCsvImportStore } from "./csv-import.store.ts";
import {
  showErrorNotification,
  showWarningNotification,
} from "components/notifications.ts";
import {
  validateCsv,
  cleanRowData,
  formatValidationMessage,
} from "@/utils/csv-validator.ts";
import { sanitizeSqlIdentifier } from "@/utils/sql-name-sanitizer.ts";

export function TableManager() {
  const storeOpen = useCsvImportStore((s) => s.open);

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];
    parse<Row>(file, {
      header: true,
      skipEmptyLines: "greedy", // Skip lines that are empty or only whitespace
      complete: (results) => {
        // Validate the parsed CSV
        const validation = validateCsv(results);

        // Show errors and abort if invalid
        if (!validation.isValid) {
          showErrorNotification({
            title: "Invalid CSV file",
            message: formatValidationMessage(validation),
          });
          return;
        }

        // Show warnings but continue
        if (validation.warnings.length > 0) {
          showWarningNotification({
            title: "CSV imported with warnings",
            message: formatValidationMessage(validation),
          });
        }

        // Clean the data (trim whitespace, filter empty rows)
        const cleanedData = cleanRowData(results.data);

        // Sanitize the table name from the file name
        const baseName = sanitizeSqlIdentifier(file.name);

        storeOpen({
          fileName: baseName,
          columns: results.meta.fields ?? [],
          rawData: cleanedData,
        });
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        showErrorNotification({
          title: "Failed to parse CSV file",
          message: error.message,
        });
      },
      transformHeader: (header, index) => {
        const trimmed = header.toLowerCase().replace(/\s+/g, "_").trim();
        // Handle empty headers by giving them a default name
        return trimmed || `column_${index + 1}`;
      },
    });
  };

  return <DropCSV onDrop={onDrop} accept={[MIME_TYPES.csv]} maxFiles={1} />;
}

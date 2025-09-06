import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse } from "papaparse";
import { DropCSV } from "../../dropzone.tsx";
import { Row, useCsvImportStore } from "./csv-import.store.ts";
import { showErrorNotification } from "components/notifications.ts";

export function TableManager() {
  const storeOpen = useCsvImportStore((s) => s.open);

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const baseName = file.name
          .replace(/\.[^/.]+$/, "") // remove extension
          .replace(/[^a-zA-Z0-9_]/g, "_") // replace invalid chars with _
          .toLowerCase();
        storeOpen({
          fileName: baseName,
          columns: results.meta.fields ?? [],
          rawData: results.data as Row[],
        });
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        showErrorNotification({
          title: "Failed to parse CSV file",
          message: error.message,
        });
      },
      transformHeader: (header) => header.toLowerCase().replace(/\s+/g, "_"),
    });
  };

  return <DropCSV onDrop={onDrop} accept={[MIME_TYPES.csv]} maxFiles={1} />;
}

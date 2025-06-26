/* eslint-disable drizzle/enforce-delete-with-where */
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse } from "papaparse";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { DropCSV } from "./dropzone.tsx";
import { CSVModal } from "./csv-modal.tsx";
import { showErrorNotification } from "components/notifications.ts";

export function TableManager() {
  const [isOpen, { open, close }] = useDisclosure(false);
  const [fileName, setFileName] = useState<string>();
  const [columns, setColumns] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, unknown>[]>([]);

  const reset = () => {
    setFileName(undefined);
    setColumns(new Set());
    setData([]);
  };

  const removeColumns = (columnsToRemove: string[]) => {
    // Remove columns from the Set
    setColumns((prev) => {
      const newSet = new Set(prev);
      columnsToRemove.forEach((column) => newSet.delete(column));
      return newSet;
    });

    // Remove columns from the actual data
    setData((prevData) =>
      prevData.map((row) => {
        const newObj: Record<string, unknown> = {};
        Object.keys(row).forEach((key) => {
          if (!columnsToRemove.includes(key)) {
            newObj[key] = row[key];
          }
        });
        return newObj;
      }),
    );
  };

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setFileName(file.name);
        setColumns(new Set(results.meta.fields));
        setData(results.data as Record<string, unknown>[]);
        open();
      },
      error: (error) => {
        showErrorNotification({
          title: "Failed to parse CSV file",
          message: error.message,
        });
      },
      worker: true,
    });
  };
  return (
    <>
      <DropCSV onDrop={onDrop} accept={[MIME_TYPES.csv]} maxFiles={1} />
      {fileName && columns.size > 0 && (
        <CSVModal
          isOpen={isOpen}
          onClose={() => {
            close();
          }}
          fileName={fileName}
          columns={Array.from(columns)}
          data={data}
          removeColumns={removeColumns}
          reset={reset}
        />
      )}
    </>
  );
}

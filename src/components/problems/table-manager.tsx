/* eslint-disable drizzle/enforce-delete-with-where */
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse, unparse } from "papaparse";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { DropCSV } from "./dropzone.tsx";
import { CSVModal } from "./csv-modal.tsx";
import { showErrorNotification, showSuccessNotification } from "components/notifications.ts";
import { useDataStorage } from "hooks/useDataStorage.ts";
//@ts-expect-error
import GenerateSchema from 'generate-schema';
import { TableMetadata } from "./types.ts";

interface Props {
  setTableMetadata: React.Dispatch<React.SetStateAction<TableMetadata[]>>;
}

export function TableManager(props: Props) {
  const { setTableMetadata } = props;

  const [isOpen, { open, close }] = useDisclosure(false);
  const [fileName, setFileName] = useState<string>();
  const [columns, setColumns] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const {
    uploadFile,
    isLoading
  } = useDataStorage();

  const GS = GenerateSchema as any;

  const reset = () => {
    setFileName(undefined);
    setColumns(new Set());
    setData([]);
  };

  const onClose = () => {
    reset();
    close();
  }

  const onSave = useCallback(async (columnsToRemove?: string[]) => {
    // Calculate the final columns and data
    const finalColumns = columnsToRemove && columnsToRemove.length > 0
      ? new Set(Array.from(columns).filter(col => !columnsToRemove.includes(col)))
      : columns;

    const finalData = columnsToRemove && columnsToRemove.length > 0
      ? data.map(row =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) => finalColumns.has(key))
        )
      )
      : data;

    // Validate we have the necessary data
    if (!fileName || finalColumns.size === 0 || finalData.length === 0) {
      console.warn('Validation failed', {
        hasFileName: !!fileName,
        columnCount: finalColumns.size,
        dataRows: finalData.length
      });
      showErrorNotification({
        title: "Invalid data",
        message: "Please ensure you have a valid file, columns, and data before saving.",
      });
      return;
    }

    try {
      const csvString = unparse(finalData, {
        header: true,
        columns: Array.from(finalColumns),
      });

      const schema = GS.json(finalData);

      const columnTypes = Object.entries(schema.items.properties).map(([key, value]) => ({
        column: key,
        type: (value as { type: string }).type
      }));

      const tableMetadata: TableMetadata = {
        tableName: fileName,
        columnTypes
      };

      await uploadFile({
        csvString,
        tableName: fileName,
        assessmentName: fileName,
        columnTypes: columnTypes,
      });

      setTableMetadata((prev) => [...prev, tableMetadata]);
      showSuccessNotification({
        title: "Save successful",
        message: `Table ${fileName} has been saved successfully.`,
      })
      reset();
      close();
    } catch (error) {
      console.error('Unexpected error during save:', error);
      showErrorNotification({
        title: "Save failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred while saving.",
      });
    }
  },
    [
      fileName,
      columns,
      data,
      uploadFile,
      setTableMetadata,
      close,
      reset,
    ]);

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];

    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setFileName(fileName);
        setColumns(new Set(results.meta.fields));
        setData(results.data as Record<string, unknown>[]);
        open();
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        showErrorNotification({
          title: "Failed to parse CSV file",
          message: error.message,
        });
      },
      transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
    });
  };

  return (
    <>
      <DropCSV onDrop={onDrop} accept={[MIME_TYPES.csv]} maxFiles={1} />
      {fileName && columns.size > 0 && (
        <CSVModal
          isOpen={isOpen}
          onClose={onClose}
          onSave={onSave}
          fileName={fileName}
          columns={Array.from(columns)}
          data={data}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

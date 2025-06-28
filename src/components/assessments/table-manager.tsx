/* eslint-disable drizzle/enforce-delete-with-where */
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse, unparse } from "papaparse";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
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

  const removeColumns = (columnsToRemove: string[]) => {
    console.log('removeColumns called with:', {
      columnsToRemove,
      currentColumns: Array.from(columns),
      dataRowCount: data.length
    });

    // Check if any of the columns to remove actually exist
    const columnsToActuallyRemove = columnsToRemove.filter(col => columns.has(col));
    if (columnsToActuallyRemove.length === 0) {
      return;
    }

    // Batch the state updates
    setColumns((prev) => {
      const newSet = new Set(prev);
      columnsToActuallyRemove.forEach((column) => newSet.delete(column));
      return newSet;
    });

    setData((prevData) => {
      const newData = prevData.map((row, index) => {
        if (index === 0) console.log('Processing first row:', Object.keys(row));
        const newObj: Record<string, unknown> = {};
        Object.keys(row).forEach((key) => {
          if (!columnsToActuallyRemove.includes(key)) {
            newObj[key] = row[key];
          }
        });
        return newObj;
      });
      return newData;
    });
  };

  const onSave = async () => {
    if (!fileName || columns.size === 0 || data.length === 0) {
      console.warn('Validation failed', {
        hasFileName: !!fileName,
        columnCount: columns.size,
        dataRows: data.length
      });
      showErrorNotification({
        title: "Invalid data",
        message: "Please ensure you have a valid file, columns, and data before saving.",
      });
      return;
    }

    try {
      const csvString = unparse(data, {
        header: true,
        columns: Array.from(columns),
      });

      await uploadFile({
        csvString,
        tableName: fileName,
        assessmentName: fileName
      });

      const schema = GS.json(data);

      const columnTypes = Object.entries(schema.items.properties).map(([key, value]) => ({
        column: key.toLowerCase().replace(/\s+/g, '_'),
        type: (value as { type: string }).type
      }));
      const tableMetadata: TableMetadata = {
        tableName: fileName,
        columnTypes
      };
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
  }


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
        console.error('CSV parse error:', error);
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
          onSave={onSave}
          fileName={fileName}
          columns={Array.from(columns)}
          data={data}
          removeColumns={removeColumns}
          reset={reset}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

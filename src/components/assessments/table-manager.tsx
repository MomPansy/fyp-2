/* eslint-disable drizzle/enforce-delete-with-where */
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse, unparse } from "papaparse";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { DropCSV } from "./dropzone.tsx";
import { CSVModal } from "./csv-modal.tsx";
import { showErrorNotification, showSuccessNotification } from "components/notifications.ts";
import { useDataStorage } from "hooks/useDataStorage.ts";

export function TableManager() {
  const [isOpen, { open, close }] = useDisclosure(false);
  const [fileName, setFileName] = useState<string>();
  const [columns, setColumns] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const {
    getOrCreateBucket,
    uploadFile,
    isLoading
  } = useDataStorage();

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
    console.log('Starting save process...', {
      fileName,
      columnCount: columns.size,
      dataRows: data.length
    });

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
      // First ensure the bucket exists (for backward compatibility)
      console.log('Creating/getting bucket...');
      const bucketResult = await getOrCreateBucket();
      console.log('Bucket ready:', bucketResult.bucket);

      // Convert data to CSV string
      console.log('Converting data to CSV...');
      const csvString = unparse(data, {
        header: true,
        columns: Array.from(columns),
      });
      console.log('CSV created, size:', csvString.length, 'bytes');

      // Upload the file using edge function (includes bucket creation and signed URL)
      console.log('Starting file upload via edge function...', { fileName });
      const uploadResult = await uploadFile({
        csvString,
        tableName: fileName,
        assessmentName: fileName // Use fileName as assessmentName for now
      });

      console.log('Upload successful', {
        filePath: uploadResult.filePath
      });
      showSuccessNotification({
        title: "Save successful",
        message: `Table ${fileName} has been saved successfully.`,
      })
      reset();
      close();
    } catch (error) {
      console.error('Unexpected error during save:', error);
      // Error notifications are already handled by the mutations
    }
  }


  const onDrop = (files: FileWithPath[]) => {
    console.log('onDrop called with files:', files.map(f => f.name));
    const file = files[0];

    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('CSV parse complete:', {
          fileName: file.name,
          fields: results.meta.fields,
          rowCount: results.data.length,
          errors: results.errors
        });

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

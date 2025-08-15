/* eslint-disable drizzle/enforce-delete-with-where */
import { FileWithPath, MIME_TYPES } from "@mantine/dropzone";
import { parse, unparse } from "papaparse";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { DropCSV } from "../../dropzone.tsx";
import { CSVModal } from "./csv-modal.tsx";
import { showErrorNotification, showSuccessNotification } from "components/notifications.ts";
import { useDataStorage } from "@/hooks/use-storage.ts";
import { useProblemContext } from "../../problem-context.ts";
import { generateSchema } from "../use-table-manager.ts";
import { ColumnType } from "server/drizzle/_custom.ts";
import { CsvImportProvider } from "./csv-import-context.tsx";


export function TableManager() {
  const [isOpen, { open, close }] = useDisclosure(false);
  const [fileName, setFileName] = useState<string>();
  const [columns, setColumns] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columnTypes, setColumnTypes] = useState<ColumnType[]>([]);
  const [numberOfRows, setNumberOfRows] = useState(0);

  const { uploadFile, isLoading } = useDataStorage();
  const { problemId } = useProblemContext();

  const reset = () => {
    setFileName(undefined);
    setColumns([]);
    setData([]);
    setColumnTypes([]);
    setNumberOfRows(0);
  };

  const onClose = () => {
    reset();
    close();
  };

  // Called at final save (after column config)
  const finalizeAndUpload = async (finalData: Record<string, unknown>[], finalColumns: string[], finalColumnTypes: ColumnType[]) => {
    try {
      const csvString = unparse(finalData, { header: true, columns: finalColumns });
      await uploadFile({
        csvString,
        tableName: fileName!,
        problemId: problemId,
        columnTypes: finalColumnTypes,
      });
      showSuccessNotification({
        title: "Save successful",
        message: `Table ${fileName} has been saved successfully.`,
      });
      reset();
      close();
    } catch (error) {
      console.error('Unexpected error during save:', error);
      showErrorNotification({
        title: "Save failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred while saving.",
      });
    }
  };

  // Prepare schema before entering column config step
  const prepareSchema = async (filteredData: Record<string, unknown>[]) => {
    const csvString = unparse(filteredData, { header: true });
    const inferred = await generateSchema(csvString);
    const inferredColumnTypesWithPK = inferred.map(col => ({ ...col, isPrimaryKey: false })); // Ensure isPrimaryKey is false initially
    setColumnTypes(inferredColumnTypesWithPK);
    setNumberOfRows(filteredData.length);
    return inferredColumnTypesWithPK;
  };

  const onDrop = (files: FileWithPath[]) => {
    const file = files[0];
    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setFileName(baseName);
        setColumns(results.meta.fields ?? []);
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
      {fileName && columns.length > 0 && (
        <CsvImportProvider
          isOpen={isOpen}
          onClose={onClose}
          fileName={fileName}
          columns={columns}
          rawData={data}
          isLoading={isLoading}
          prepareSchema={prepareSchema}
          initialColumnTypes={columnTypes}
          finalizeUpload={finalizeAndUpload}
        >
          <CSVModal />
        </CsvImportProvider>
      )}
    </>
  );
}

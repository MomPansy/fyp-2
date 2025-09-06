import {
  Accordion,
  Button,
  Flex,
  Group,
  ModalBody,
  Stack,
  Table,
  Title,
  Text,
} from "@mantine/core";
import { IconFileTypeCsv } from "@tabler/icons-react";
import { useState } from "react";
import { unparse } from "papaparse";
import { ToggleButton } from "../../../buttons/toggle-button.tsx";
import { useInferSchemaMutation } from "../use-table-manager.ts";
import { useCsvImportStore } from "./csv-import.store.ts";
import { sampleRows } from "./csv-import.service.ts";
import { showErrorNotification } from "@/components/notifications.ts";

export function DataConfig() {
  // states
  const fileName = useCsvImportStore((state) => state.fileName);
  const initialColumns = useCsvImportStore((state) => state.initialColumns);
  const rawData = useCsvImportStore((state) => state.rawData);
  const currentColumnTypes = useCsvImportStore((state) => state.columnTypes);

  // actions
  const setColumnTypes = useCsvImportStore.getState().setColumnTypes;
  const setFilteredColumns = useCsvImportStore.getState().setFilteredColumns;
  const getFilteredData = useCsvImportStore.getState().getFilteredData;

  const close = useCsvImportStore.getState().close;
  const reset = useCsvImportStore.getState().reset;
  const next = useCsvImportStore.getState().next;

  const { mutateAsync: inferSchema } = useInferSchemaMutation();

  const onClose = () => {
    reset();
    close();
  };

  const [columnsToRemove, setColumnsToRemove] = useState<string[]>([]);

  const visibleColumns = initialColumns.filter(
    (c) => !columnsToRemove.includes(c),
  );

  const handleContinue = async () => {
    const cols = visibleColumns;
    setFilteredColumns(cols);
    const filteredData = getFilteredData();

    const sampleData = sampleRows(filteredData, 200);
    const sampleCsvString = unparse(sampleData, { header: true });
    const inferred = await inferSchema(
      {
        csvString: sampleCsvString,
      },
      {
        onError: (error) => {
          showErrorNotification({
            title: "Failed to infer schema",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while inferring the schema.",
          });
        },
      },
    );

    // Preserve existing isPrimaryKey values when merging with inferred schema
    const inferredColumnTypesWithPK = inferred.map((col) => {
      const existingColumn = currentColumnTypes.find(
        (existing) => existing.column === col.column,
      );
      return {
        ...col,
        isPrimaryKey: existingColumn?.isPrimaryKey ?? false,
      };
    });
    setColumnTypes(inferredColumnTypesWithPK);
    next();
  };

  const onToggle = (label: string, isSelected: boolean) => {
    if (isSelected) {
      setColumnsToRemove((prev) => prev.filter((c) => c !== label));
    } else {
      setColumnsToRemove((prev) => [...prev, label]);
    }
  };

  return (
    <ModalBody p={0}>
      <Stack>
        <Stack>
          <Text size="sm">
            Upload a CSV file. The first row should be the heads of the table,
            and your headers should not include any special characters other
            then hyphens (-) and underscores (_).
          </Text>
          <Text size="sm">
            Tip: Datetime columns should be formated as YYYY-MM-DD HH:mm:ss.
          </Text>
          <Stack
            justify="center"
            align="center"
            p={30}
            className="border rounded-sm border-dotted"
          >
            <Group gap={5}>
              <IconFileTypeCsv size={24} />
              <Text size="sm" fw="bold">
                {fileName}
              </Text>
            </Group>
            <Button variant="outline" onClick={onClose}>
              Remove File
            </Button>
          </Stack>
        </Stack>
        <Accordion
          multiple
          styles={{
            control: { paddingLeft: 0, paddingRight: 0 },
            content: { paddingLeft: 0, paddingRight: 0 },
          }}
        >
          <Accordion.Item value="import-data">
            <Accordion.Control>
              <Title order={5}>Configure import data</Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <Text size="sm">
                  Select which columns to import. <br />
                  Here is a preview of the data that will be added (up to the
                  first 20 columns and first 20 rows).
                </Text>
                <Group gap="xs" wrap="wrap">
                  {initialColumns.map((column) => (
                    <ToggleButton
                      key={column}
                      label={column}
                      onToggle={onToggle}
                    />
                  ))}
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="Preview data">
            <Accordion.Control>
              <Title order={5}>Preview data to be imported</Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <Text size="sm">
                  Here is a preview of the data that will be added.
                </Text>
                <div
                  style={{
                    overflowX: "auto",
                    overflowY: "auto",
                    maxHeight: "400px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                  }}
                >
                  <Table withColumnBorders highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        {visibleColumns.map((column) => (
                          <Table.Th
                            key={column}
                            style={{
                              minWidth: "120px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {column}
                          </Table.Th>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rawData.slice(0, 20).map((row, rowIndex) => (
                        <Table.Tr key={rowIndex}>
                          {visibleColumns.map((column) => (
                            <Table.Td
                              key={column}
                              style={{
                                minWidth: "120px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row[column] !== undefined
                                ? // eslint-disable-next-line @typescript-eslint/no-base-to-string, prettier/prettier
                                String(row[column])
                                : ""}
                            </Table.Td>
                          ))}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        <Flex justify="flex-end">
          <Button onClick={handleContinue}>Continue</Button>
        </Flex>
      </Stack>
    </ModalBody>
  );
}

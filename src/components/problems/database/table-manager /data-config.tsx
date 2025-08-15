import { Accordion, Button, Flex, Group, ModalBody, Stack, Table, Title, Text } from "@mantine/core";
import { IconFileTypeCsv } from "@tabler/icons-react";
import { useState } from "react";
import { useCsvImport } from "./csv-import-context.tsx";
import { ToggleButton } from "../../../buttons/toggle-button.tsx";

export function DataConfig() {
  const {
    onClose,
    fileName,
    columns,
    updateFilteredColumns,
    filteredDataRef,
    rawData,
    goToNext,
    prepareSchema,
    setColumnTypes,
  } = useCsvImport();

  const [accordionOpened, setAccordionOpened] = useState<string[]>([]);
  const [columnsToRemove, setColumnsToRemove] = useState<string[]>([]);

  const visibleColumns = columns.filter(c => !columnsToRemove.includes(c));

  const handleContinue = async () => {
    const cols = visibleColumns;
    updateFilteredColumns(cols); // updates ref synchronously
    const inferredColumnTypesWithPK = await prepareSchema(filteredDataRef.current);
    setColumnTypes(inferredColumnTypesWithPK);
    goToNext();
  };

  const onToggle = (label: string, isSelected: boolean) => {
    if (isSelected) {
      setColumnsToRemove(prev => prev.filter(c => c !== label));
    } else {
      setColumnsToRemove(prev => [...prev, label]);
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
          value={accordionOpened}
          onChange={setAccordionOpened}
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
                  {columns?.map((column) => (
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
                              {row[column] !== undefined ? String(row[column]) : ""}
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
        <Flex justify="flex-end" >
          <Button onClick={handleContinue}>Continue</Button>
        </Flex>
      </Stack>
    </ModalBody>
  );
}
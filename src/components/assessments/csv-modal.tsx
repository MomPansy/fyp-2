/* eslint-disable @typescript-eslint/no-base-to-string */
import {
  Accordion,
  Button,
  Flex,
  Group,
  LoadingOverlay,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconFileTypeCsv } from "@tabler/icons-react";
import { ToggleButton } from "components/buttons/toggle-button";
import { useState } from "react";
interface CSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  columns: string[] | undefined;
  removeColumns: (columns: string[]) => void;
  data: Record<string, unknown>[];
  reset: () => void;
  onSave: () => void;
  isLoading?: boolean;
}

export function CSVModal(props: CSVModalProps) {
  const { isOpen, onClose, fileName, columns, removeColumns, reset, onSave: onSaveProp, isLoading = false } = props;
  const [columnsToRemove, setColumnsToRemove] = useState<string[]>([]);
  const [accordionOpened, setAccordionOpened] = useState<string[]>([]);
  const filteredColumns =
    columns?.filter((col) => !columnsToRemove.includes(col)) ?? [];

  const handleSave = async () => {
    if (columnsToRemove.length > 0) {
      removeColumns(columnsToRemove);
    }
    await onSaveProp();
    onClose();
  }

  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        onClose();
      }}
      size="xl"
      title="Add content to new table"
    >
      <Modal.Body p={0}>
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
              <Button variant="outline" onClick={reset}>
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
                    {columns?.map((column, index) => (
                      <ToggleButton
                        key={column}
                        label={column}
                        index={index}
                        onToggle={(column, isSelected) => {
                          if (isSelected) {
                            setColumnsToRemove((prev) =>
                              prev.filter((col) => col !== column),
                            );
                          } else {
                            setColumnsToRemove((prev) => [...prev, column]);
                          }
                        }}
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
                          {filteredColumns.map((column) => (
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
                        {props.data.slice(0, 20).map((row, rowIndex) => (
                          <Table.Tr key={rowIndex}>
                            {filteredColumns.map((column) => (
                              <Table.Td
                                key={column}
                                style={{
                                  minWidth: "120px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {row[column] !== undefined
                                  ? String(row[column])
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
          <Flex justify="flex-end" >
            <Button
              type="submit"
              onClick={handleSave}
              loading={isLoading}
              disabled={isLoading}
            >
              Save
            </Button>
          </Flex>
        </Stack>
      </Modal.Body>
      <LoadingOverlay
        visible={isLoading}
      />
    </Modal>
  );
}


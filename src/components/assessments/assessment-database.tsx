import {
  Paper,
  Stack,
  Title,
  Grid,
  Flex,
  SimpleGrid,
  Select,
  ActionIcon,
  Button,
  Text,
  Group,
  Code,
} from "@mantine/core";
import { IconArrowRight, IconTrash } from "@tabler/icons-react";
import { TableManager } from "./table-manager.tsx";
import { ToggleButton } from "../buttons/toggle-button.tsx";
import { useMemo, useState } from "react";
import { TableMetadata } from "./types.ts";

const mockTableNames = [
  "users",
  "orders",
  "products",
  "categories",
  "reviews",
  "payments",
  "shipments",
];

export function AssessmentDatabaseSetup() {
  const [tableMetadata, setTableMetadata] = useState<TableMetadata[]>([]);
  const [selectedTable1Index, setSelectedTable1Index] = useState<number | null>(null);
  const [selectedTable2Index, setSelectedTable2Index] = useState<number | null>(null);
  // Add state for foreign key mappings
  const [foreignKeyMappings, setForeignKeyMappings] = useState<{
    table1Column: string;
    table2Column: string;
  }[]>([{ table1Column: "", table2Column: "" }]);

  const tables = useMemo(() => {
    return tableMetadata.map((meta) => meta.tableName);
  }, [tableMetadata]);

  // Fallback to mock data if no table metadata is available
  const displayTables = tables.length > 0 ? tables : mockTableNames;

  const handleTable1Toggle = (label: string, index: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTable1Index(index);
      // If this table was selected in table2, remove it
      if (selectedTable2Index === index) {
        setSelectedTable2Index(null);
      }
    } else {
      setSelectedTable1Index(null);
    }
  };

  const handleTable2Toggle = (label: string, index: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTable2Index(index);
      // If this table was selected in table1, remove it
      if (selectedTable1Index === index) {
        setSelectedTable1Index(null);
      }
    } else {
      setSelectedTable2Index(null);
    }
  };

  // Get column names for the selected tables
  const table1Columns = selectedTable1Index !== null && tableMetadata[selectedTable1Index]
    ? tableMetadata[selectedTable1Index].columnTypes.map(col => col.column)
    : [];

  const table2Columns = selectedTable2Index !== null && tableMetadata[selectedTable2Index]
    ? tableMetadata[selectedTable2Index].columnTypes.map(col => col.column)
    : [];

  const selectedTable1Name = selectedTable1Index !== null ? displayTables[selectedTable1Index] : null;
  const selectedTable2Name = selectedTable2Index !== null ? displayTables[selectedTable2Index] : null;

  // Add functions to handle foreign key mapping changes
  const addForeignKeyMapping = () => {
    setForeignKeyMappings([...foreignKeyMappings, { table1Column: "", table2Column: "" }]);
  };

  const removeForeignKeyMapping = (index: number) => {
    if (foreignKeyMappings.length > 1) {
      setForeignKeyMappings(foreignKeyMappings.filter((_, i) => i !== index));
    }
  };

  const updateForeignKeyMapping = (index: number, field: 'table1Column' | 'table2Column', value: string) => {
    const updated = [...foreignKeyMappings];
    updated[index][field] = value;
    setForeignKeyMappings(updated);
  };

  return (
    <>
      <Paper p={20} withBorder>
        <Stack>
          <Title> Database Setup </Title>
          <TableManager setTableMetadata={setTableMetadata} />
          <Title order={3}> Foreign keys </Title>

          <Stack gap="xs">
            <Text size="sm" fw={500}>Tables</Text>
            <Group gap="xs">
              {displayTables.map((table, index) => (
                <ToggleButton
                  key={`table1-${table}`}
                  label={table}
                  index={index}
                  onToggle={handleTable1Toggle}
                  disabled={selectedTable2Index === index}
                  isSelected={selectedTable1Index === index}
                />
              ))}
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={500}>Select a table to reference to</Text>
            <Group gap="xs">
              {displayTables.map((table, index) => (
                <ToggleButton
                  key={`table2-${table}`}
                  label={table}
                  index={index}
                  onToggle={handleTable2Toggle}
                  disabled={selectedTable1Index === index}
                  isSelected={selectedTable2Index === index}
                />
              ))}
            </Group>
          </Stack>

          <Text size="sm">
            Select columns from <Code>
              {selectedTable1Name ?? "Table 1"}
            </Code> to reference to <Code>
              {selectedTable2Name ?? "Table 2"}
            </Code>
          </Text>
          <Paper withBorder px={20} py={20}>
            <Grid pb={10}>
              <Grid.Col span={3}>
                <Text size="sm">{selectedTable1Name || "Table 1"}</Text>
              </Grid.Col>
              <Grid.Col span={3} />
              <Grid.Col span={3}>
                <Flex justify="flex-end">
                  <Text size="sm">{selectedTable2Name || "Table 2"}</Text>
                </Flex>
              </Grid.Col>
              <Grid.Col span={3} />
            </Grid>

            {foreignKeyMappings.map((mapping, index) => (
              <SimpleGrid cols={4} pb={20} key={index}>
                <Select
                  placeholder="Select column..."
                  data={table1Columns}
                  disabled={table1Columns.length === 0}
                  value={mapping.table1Column}
                  onChange={(value) => updateForeignKeyMapping(index, 'table1Column', value || '')}
                />
                <Flex justify="center">
                  <IconArrowRight size={24} />
                </Flex>
                <Select
                  placeholder="Select column..."
                  data={table2Columns}
                  disabled={table2Columns.length === 0}
                  value={mapping.table2Column}
                  onChange={(value) => updateForeignKeyMapping(index, 'table2Column', value || '')}
                />
                <Flex justify="center">
                  <ActionIcon
                    onClick={() => removeForeignKeyMapping(index)}
                    disabled={foreignKeyMappings.length === 1}
                    color="red"
                  >
                    <IconTrash size={24} />
                  </ActionIcon>
                </Flex>
              </SimpleGrid>
            ))}
            <Button onClick={addForeignKeyMapping}>Add another column</Button>
          </Paper>
        </Stack>
      </Paper>
    </>
  );
}

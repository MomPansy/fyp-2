import {
  Paper,
  Grid,
  Flex,
  SimpleGrid,
  Select,
  ActionIcon,
  Button,
  Text,
  Code,
  Fieldset,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { IconArrowRight, IconTrash } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { ColumnType, ForeignKeyMapping } from "../database-types.ts";

// Exported utility function to process foreign key mappings
export const processForeignKeyMappings = (mappings: ForeignKeyMapping[]): Record<string, ForeignKeyMapping[]> => {
  // drop the mappings with any empty values 
  const filteredMappings = mappings.filter(mapping =>
    mapping.table1Column && mapping.table2Column && mapping.table1Name && mapping.table2Name && mapping.table1ColumnType && mapping.table2ColumnType
  );

  // group by table1Name, table1Name will be the base table and the rest will be the foreign tables 
  const groupedMappings = filteredMappings.reduce((acc, mapping) => {
    if (!acc[mapping.table1Name]) {
      acc[mapping.table1Name] = [];
    }
    acc[mapping.table1Name].push({
      table1Name: mapping.table1Name,
      table2Name: mapping.table2Name,
      table1Column: mapping.table1Column,
      table2Column: mapping.table2Column,
      table1ColumnType: mapping.table1ColumnType,
      table2ColumnType: mapping.table2ColumnType
    });
    return acc;
  }, {} as Record<string, ForeignKeyMapping[]>);

  return groupedMappings;
};

interface ForeignKeySelectorProps {
  table1Columns: ColumnType[];
  table2Columns: ColumnType[];
  selectedTable1Name: string | null;
  selectedTable2Name: string | null;
  onMappingsChange?: (mappings: ForeignKeyMapping[]) => void;
  onSave?: (groupedMappings: Record<string, ForeignKeyMapping[]>) => void;
}

export function ForeignKeySelector({
  table1Columns,
  table2Columns,
  selectedTable1Name,
  selectedTable2Name,
  onMappingsChange,
  onSave,
}: ForeignKeySelectorProps) {
  // Store mappings grouped by table pair
  const [groupedMappings, setGroupedMappings] = useState<Record<string, ForeignKeyMapping[]>>({});

  // Generate a key for the current table pair
  const currentPairKey = `${selectedTable1Name || 'table1'}_to_${selectedTable2Name || 'table2'}`;

  // Get current mappings for the selected table pair
  const currentMappings = groupedMappings[currentPairKey] || [{
    table1Name: selectedTable1Name || '',
    table1Column: '',
    table1ColumnType: '',
    table2Name: selectedTable2Name || '',
    table2Column: '',
    table2ColumnType: ''
  }];

  // Update the grouped mappings when current mappings change
  const updateGroupedMappings = (newMappings: ForeignKeyMapping[]) => {
    setGroupedMappings(prev => ({
      ...prev,
      [currentPairKey]: newMappings
    }));
  };

  // Initialize current pair if it doesn't exist
  useEffect(() => {
    if (!groupedMappings[currentPairKey]) {
      updateGroupedMappings([{
        table1Name: selectedTable1Name || '',
        table1Column: '',
        table1ColumnType: '',
        table2Name: selectedTable2Name || '',
        table2Column: '',
        table2ColumnType: ''
      }]);
    }
  }, [currentPairKey, selectedTable1Name, selectedTable2Name]);

  // Call callback when mappings change - flatten all mappings
  useEffect(() => {
    const allMappings = Object.values(groupedMappings).flat();
    onMappingsChange?.(allMappings);
  }, [groupedMappings, onMappingsChange]);

  const addForeignKeyMapping = () => {
    const newMapping = {
      table1Name: selectedTable1Name || '',
      table1Column: '',
      table1ColumnType: '',
      table2Name: selectedTable2Name || '',
      table2Column: '',
      table2ColumnType: ''
    };
    updateGroupedMappings([...currentMappings, newMapping]);
  };

  const removeForeignKeyMapping = (index: number) => {
    if (currentMappings.length > 1) {
      const filtered = currentMappings.filter((_, i) => i !== index);
      updateGroupedMappings(filtered);
    }
  };

  const updateForeignKeyMapping = (index: number, field: 'table1Column' | 'table2Column', value: string) => {
    const updated = [...currentMappings];
    updated[index][field] = value;

    // Update the corresponding type field when column changes
    if (field === 'table1Column') {
      const columnType = table1Columns.find(col => col.column === value)?.type || '';
      updated[index].table1ColumnType = columnType;
      // Update table name when column is selected
      updated[index].table1Name = selectedTable1Name || '';
    } else if (field === 'table2Column') {
      const columnType = table2Columns.find(col => col.column === value)?.type || '';
      updated[index].table2ColumnType = columnType;
      // Update table name when column is selected
      updated[index].table2Name = selectedTable2Name || '';
    }

    updateGroupedMappings(updated);
  };

  return (
    <Fieldset legend={
      <Text size="sm">
        Select columns from <Code>
          {selectedTable1Name ?? "Table 1"}
        </Code> to reference to <Code>
          {selectedTable2Name ?? "Table 2"}
        </Code>
      </Text>
    }>
      <Paper px={20} py={20} >
        <ScrollArea h="20rem" scrollbars="y">
          <Grid pb={10}>
            <Grid.Col span={3}>
              <Text size="sm">{selectedTable1Name || "Table 1"}</Text>
            </Grid.Col>
            <Grid.Col span={3} />
            <Grid.Col span={3}>
              <Flex justify="flex-start">
                <Text size="sm">{selectedTable2Name || "Table 2"}</Text>
              </Flex>
            </Grid.Col>
            <Grid.Col span={3} />
          </Grid>
          {currentMappings.map((mapping, index) => (
            <SimpleGrid cols={6} pb={20} key={index}>
              <Select
                placeholder="Select column..."
                data={table1Columns.map(col => {
                  const hasTypeMismatch = mapping.table2Column ? col.type !== table2Columns.find(t2Col => t2Col.column === mapping.table2Column)?.type : false;
                  const isDuplicate = currentMappings.some((otherMapping, otherIndex) =>
                    otherIndex !== index && otherMapping.table1Column === col.column
                  );

                  return {
                    value: col.column,
                    label: `${col.column}${isDuplicate ? ' (already used)' : hasTypeMismatch ? ' (type mismatch)' : ''}`,
                    disabled: hasTypeMismatch || isDuplicate
                  };
                })}
                disabled={table1Columns.length === 0}
                value={mapping.table1Column}
                onChange={(value) => updateForeignKeyMapping(index, 'table1Column', value || '')}
              />
              <Flex align='center' justify="flex-start">
                <Badge>
                  {mapping.table1ColumnType || "Type"}
                </Badge>
              </Flex>
              <Flex justify="center">
                <IconArrowRight size={24} />
              </Flex>
              <Select
                placeholder="Select column..."
                data={table2Columns.map(col => {
                  const hasTypeMismatch = mapping.table1Column ? col.type !== table1Columns.find(t1Col => t1Col.column === mapping.table1Column)?.type : false;
                  const isDuplicate = currentMappings.some((otherMapping, otherIndex) =>
                    otherIndex !== index && otherMapping.table2Column === col.column
                  );

                  return {
                    value: col.column,
                    label: `${col.column}${isDuplicate ? ' (already used)' : hasTypeMismatch ? ' (type mismatch)' : ''}`,
                    disabled: hasTypeMismatch || isDuplicate
                  };
                })}
                disabled={table2Columns.length === 0}
                value={mapping.table2Column}
                onChange={(value) => updateForeignKeyMapping(index, 'table2Column', value || '')}
              />
              <Flex align='center' justify="flex-start">
                <Badge>
                  {mapping.table2ColumnType || "Type"}
                </Badge>
              </Flex>
              <Flex justify="center">
                <ActionIcon
                  onClick={() => removeForeignKeyMapping(index)}
                  disabled={currentMappings.length === 1}
                  color="red"
                >
                  <IconTrash size={24} />
                </ActionIcon>
              </Flex>
            </SimpleGrid>
          ))}
          <Button onClick={addForeignKeyMapping}>Add another column</Button>

          {/* Debug section to show all grouped mappings */}
          {Object.keys(groupedMappings).length > 0 && (
            <Paper mt="md" p="sm" withBorder style={{ backgroundColor: '#f8f9fa' }}>
              <Text size="xs" fw={500} mb="xs">Debug: All Table Pair Mappings</Text>
              {Object.entries(groupedMappings).map(([pairKey, mappings]) => (
                <Text key={pairKey} size="xs" c="dimmed">
                  {pairKey}: {mappings.filter(m => m.table1Column && m.table2Column).length} mapping(s)
                </Text>
              ))}
            </Paper>
          )}
        </ScrollArea>
      </Paper>
    </Fieldset>
  );
}

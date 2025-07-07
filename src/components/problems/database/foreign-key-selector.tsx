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
import { ColumnType, ForeignKeyMapping } from "./database-types.ts";

// Exported utility function to process foreign key mappings
export const processForeignKeyMappings = (mappings: ForeignKeyMapping[]): Record<string, ForeignKeyMapping[]> => {
  // drop the mappings with any empty values 
  const filteredMappings = mappings.filter(mapping =>
    mapping.baseColumnName && mapping.foreignTableColumn && mapping.baseTableName && mapping.foreignTableName && mapping.baseColumnType && mapping.foreignTableType
  );

  // group by baseTableName, baseTableName will be the base table and the rest will be the foreign tables 
  const groupedMappings = filteredMappings.reduce((acc, mapping) => {
    if (!acc[mapping.baseTableName]) {
      acc[mapping.baseTableName] = [];
    }
    acc[mapping.baseTableName].push({
      baseTableName: mapping.baseTableName,
      foreignTableName: mapping.foreignTableName,
      baseColumnName: mapping.baseColumnName,
      foreignTableColumn: mapping.foreignTableColumn,
      baseColumnType: mapping.baseColumnType,
      foreignTableType: mapping.foreignTableType
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
  initialMappings?: Record<string, ForeignKeyMapping[]>;
}

export function ForeignKeySelector({
  table1Columns,
  table2Columns,
  selectedTable1Name,
  selectedTable2Name,
  onMappingsChange,
  onSave,
  initialMappings,
}: ForeignKeySelectorProps) {
  // Store mappings grouped by table pair
  const [groupedMappings, setGroupedMappings] = useState<Record<string, ForeignKeyMapping[]>>(
    initialMappings || {}
  );

  // Generate a key for the current table pair
  const currentPairKey = `${selectedTable1Name || 'table1'}_to_${selectedTable2Name || 'table2'}`;

  // Get current mappings for the selected table pair
  const currentMappings = groupedMappings[currentPairKey] || [{
    baseTableName: selectedTable1Name || '',
    baseColumnName: '',
    baseColumnType: '',
    foreignTableName: selectedTable2Name || '',
    foreignTableColumn: '',
    foreignTableType: ''
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
        baseTableName: selectedTable1Name || '',
        baseColumnName: '',
        baseColumnType: '',
        foreignTableName: selectedTable2Name || '',
        foreignTableColumn: '',
        foreignTableType: ''
      }]);
    }
  }, [currentPairKey, selectedTable1Name, selectedTable2Name]);

  // Update grouped mappings when initial data changes
  useEffect(() => {
    if (initialMappings) {
      setGroupedMappings(initialMappings);
    }
  }, [initialMappings]);

  // Call callback when mappings change - flatten all mappings
  useEffect(() => {
    const allMappings = Object.values(groupedMappings).flat();
    onMappingsChange?.(allMappings);
  }, [groupedMappings, onMappingsChange]);

  const addForeignKeyMapping = () => {
    const newMapping = {
      baseTableName: selectedTable1Name || '',
      baseColumnName: '',
      baseColumnType: '',
      foreignTableName: selectedTable2Name || '',
      foreignTableColumn: '',
      foreignTableType: ''
    };
    updateGroupedMappings([...currentMappings, newMapping]);
  };

  const removeForeignKeyMapping = (index: number) => {
    if (currentMappings.length > 1) {
      const filtered = currentMappings.filter((_, i) => i !== index);
      updateGroupedMappings(filtered);
    }
  };

  const updateForeignKeyMapping = (index: number, field: 'baseColumnName' | 'foreignTableColumn', value: string) => {
    const updated = [...currentMappings];
    updated[index][field] = value;

    // Update the corresponding type field when column changes
    if (field === 'baseColumnName') {
      const columnType = table1Columns.find(col => col.column === value)?.type || '';
      updated[index].baseColumnType = columnType;
      // Update table name when column is selected
      updated[index].baseTableName = selectedTable1Name || '';
    } else if (field === 'foreignTableColumn') {
      const columnType = table2Columns.find(col => col.column === value)?.type || '';
      updated[index].foreignTableType = columnType;
      // Update table name when column is selected
      updated[index].foreignTableName = selectedTable2Name || '';
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
                  const hasTypeMismatch = mapping.foreignTableColumn ? col.type !== table2Columns.find(t2Col => t2Col.column === mapping.foreignTableColumn)?.type : false;
                  const isDuplicate = currentMappings.some((otherMapping, otherIndex) =>
                    otherIndex !== index && otherMapping.baseColumnName === col.column
                  );

                  return {
                    value: col.column,
                    label: `${col.column}${isDuplicate ? ' (already used)' : hasTypeMismatch ? ' (type mismatch)' : ''}`,
                    disabled: hasTypeMismatch || isDuplicate
                  };
                })}
                disabled={table1Columns.length === 0}
                value={mapping.baseColumnName}
                onChange={(value) => updateForeignKeyMapping(index, 'baseColumnName', value || '')}
              />
              <Flex align='center' justify="flex-start">
                <Badge>
                  {mapping.baseColumnType || "Type"}
                </Badge>
              </Flex>
              <Flex justify="center">
                <IconArrowRight size={24} />
              </Flex>
              <Select
                placeholder="Select column..."
                data={table2Columns.map(col => {
                  const hasTypeMismatch = mapping.baseColumnName ? col.type !== table1Columns.find(t1Col => t1Col.column === mapping.baseColumnName)?.type : false;
                  const isDuplicate = currentMappings.some((otherMapping, otherIndex) =>
                    otherIndex !== index && otherMapping.foreignTableColumn === col.column
                  );

                  return {
                    value: col.column,
                    label: `${col.column}${isDuplicate ? ' (already used)' : hasTypeMismatch ? ' (type mismatch)' : ''}`,
                    disabled: hasTypeMismatch || isDuplicate
                  };
                })}
                disabled={table2Columns.length === 0}
                value={mapping.foreignTableColumn}
                onChange={(value) => updateForeignKeyMapping(index, 'foreignTableColumn', value || '')}
              />
              <Flex align='center' justify="flex-start">
                <Badge>
                  {mapping.foreignTableType || "Type"}
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
                  {pairKey}: {mappings.filter(m => m.baseColumnName && m.foreignTableColumn).length} mapping(s)
                </Text>
              ))}
            </Paper>
          )}
        </ScrollArea>
      </Paper>
    </Fieldset>
  );
}

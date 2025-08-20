import {
  Button,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";
import { TableManager } from "./table-manager /table-manager.tsx";
import { Profiler, useState } from "react";
import { TableSelector } from "./table-selector.tsx";
import { ForeignKeySelector, processForeignKeyMappings } from "./foreign-key-selector.tsx";
import { useTableSelection } from "./use-table-selection.ts";
import { ForeignKeyMapping } from "./database-types.ts";
import { useSaveRelations } from "./use-foreign-key-selection.ts";
import { TableMetadata } from "../types.ts";
import { useProblemContext } from "../problem-context.ts";
import { useNavigate } from "@tanstack/react-router";

interface ProblemDatabaseProps {
  tableMetadata: TableMetadata[];
  groupedMappings: Record<string, ForeignKeyMapping[]>;
}

export function ProblemDatabase({ tableMetadata, groupedMappings }: ProblemDatabaseProps) {
  const [foreignKeyMappings, setForeignKeyMappings] = useState<ForeignKeyMapping[]>([]);
  const saveRelationsMutation = useSaveRelations();
  const problemId = useProblemContext().problemId;
  const {
    selectedTable1Index,
    selectedTable2Index,
    handleTable1Toggle,
    handleTable2Toggle,
  } = useTableSelection();

  const navigate = useNavigate();

  const table1Columns = selectedTable1Index !== null && tableMetadata[selectedTable1Index]
    ? tableMetadata[selectedTable1Index].columnTypes
    : [];

  const table2Columns = selectedTable2Index !== null && tableMetadata[selectedTable2Index]
    ? tableMetadata[selectedTable2Index].columnTypes
    : [];

  const selectedTable1Name = selectedTable1Index !== null ? tableMetadata[selectedTable1Index].tableName : null;
  const selectedTable2Name = selectedTable2Index !== null ? tableMetadata[selectedTable2Index].tableName : null;

  const handleSave = async () => {
    const processedMappings = processForeignKeyMappings(foreignKeyMappings);

    try {
      await saveRelationsMutation.mutateAsync(processedMappings);
    } catch (error) {
      console.error("Failed to save relations:", error);
      throw error; // Re-throw to allow caller to handle
    }
  };

  const handleSaveAndNavigate = async () => {
    try {
      await handleSave();
      // Navigation will be handled by the success case
      navigate({
        to: `/admin/problem/$id/create`,
        params: { id: problemId },
      })
    } catch (error) {
      // Error handling - stay on current page
      console.error("Save failed, not navigating:", error);
    }
  };

  const handleMappingsChange = (mappings: ForeignKeyMapping[]) => {
    setForeignKeyMappings(mappings);
  };


  return (
    <Paper p={20} withBorder>
      <Stack>
        <Title>Database Setup</Title>
        <TableManager />
        <Title order={3}>Foreign keys</Title>

        {/* <Stack gap="xs">
          <TableSelector
            tables={tableMetadata}
            legend="Tables"
            onToggle={handleTable1Toggle}
            selectedIndex={selectedTable1Index}
            disabledIndex={selectedTable2Index}
          />
        </Stack>

        <Stack gap="xs">
          <TableSelector
            tables={tableMetadata}
            legend="Select a table to reference to"
            onToggle={handleTable2Toggle}
            selectedIndex={selectedTable2Index}
            disabledIndex={selectedTable1Index}
          />
        </Stack>

        <ForeignKeySelector
          table1Columns={table1Columns}
          table2Columns={table2Columns}
          selectedTable1Name={selectedTable1Name}
          selectedTable2Name={selectedTable2Name}
          onMappingsChange={handleMappingsChange}
          initialMappings={groupedMappings}
        /> */}
      </Stack>
      <Group justify="flex-end" align='center' mt={20}>
        <Button
          variant="outline"
          onClick={handleSave}
          loading={saveRelationsMutation.isPending}
          disabled={saveRelationsMutation.isPending || foreignKeyMappings.length === 0}
        >
          Save Relations
        </Button>
        <Button
          color="blue"
          onClick={handleSaveAndNavigate}
          loading={saveRelationsMutation.isPending}
          disabled={saveRelationsMutation.isPending || foreignKeyMappings.length === 0}
        >
          Next Step
        </Button>
      </Group>
    </Paper >
  );
}

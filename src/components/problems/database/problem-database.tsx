import {
  Button,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";
import { TableManager } from "./table-manager.tsx";
import { Suspense, useState } from "react";
import { useProblemContext } from "../problem-context.ts";
import { useFetchProblemTablesColumnTypes } from "@/hooks/use-problem.ts";
import { TableSelector } from "../table-selector.tsx";
import { ForeignKeySelector, processForeignKeyMappings } from "./foreign-key-selector.tsx";
import { ProblemDatabaseSkeleton } from "./problem-database-skeleton.tsx";
import { useTableSelection } from "../use-table-selection.ts";
import { ForeignKeyMapping } from "./database-types.ts";
import { useSaveRelations } from "./use-foreign-key-selection.ts";

export function ProblemDatabase() {
  const { problemId } = useProblemContext();
  const { data } = useFetchProblemTablesColumnTypes(problemId);
  const [foreignKeyMappings, setForeignKeyMappings] = useState<ForeignKeyMapping[]>([]);
  const saveRelationsMutation = useSaveRelations();

  const {
    selectedTable1Index,
    selectedTable2Index,
    handleTable1Toggle,
    handleTable2Toggle,
  } = useTableSelection();

  const table1Columns = selectedTable1Index !== null && data[selectedTable1Index]
    ? data[selectedTable1Index].columnTypes
    : [];

  const table2Columns = selectedTable2Index !== null && data[selectedTable2Index]
    ? data[selectedTable2Index].columnTypes
    : [];

  const selectedTable1Name = selectedTable1Index !== null ? data[selectedTable1Index].tableName : null;
  const selectedTable2Name = selectedTable2Index !== null ? data[selectedTable2Index].tableName : null;

  const handleSave = async () => {
    const processedMappings = processForeignKeyMappings(foreignKeyMappings);
    console.log("Saving relations:", processedMappings);

    try {
      await saveRelationsMutation.mutateAsync(processedMappings);
      console.log("Relations saved successfully!");
    } catch (error) {
      console.error("Failed to save relations:", error);
    }
  };

  const handleMappingsChange = (mappings: ForeignKeyMapping[]) => {
    setForeignKeyMappings(mappings);
  };

  return (
    <Suspense fallback={<ProblemDatabaseSkeleton />}>
      <Paper p={20} withBorder>
        <Stack>
          <Title>Database Setup</Title>
          <TableManager />
          <Title order={3}>Foreign keys</Title>

          <Stack gap="xs">
            <TableSelector
              tables={data}
              legend="Tables"
              onToggle={handleTable1Toggle}
              selectedIndex={selectedTable1Index}
              disabledIndex={selectedTable2Index}
            />
          </Stack>

          <Stack gap="xs">
            <TableSelector
              tables={data}
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
          />
        </Stack>
        <Group justify="flex-end" mt="md">
          <Button
            variant="outline"
            onClick={handleSave}
            loading={saveRelationsMutation.isPending}
            disabled={saveRelationsMutation.isPending || foreignKeyMappings.length === 0}
          >
            Save Relations
          </Button>
          <Button>
            Next Step
          </Button>
        </Group>
      </Paper>
    </Suspense >
  );
}

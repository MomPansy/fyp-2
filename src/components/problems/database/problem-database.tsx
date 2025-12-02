import {
  Button,
  Code,
  Drawer,
  Group,
  Paper,
  Stack,
  Table,
  Title,
  Text,
} from "@mantine/core";
import { useState, useCallback } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { IconArrowRight, IconCheck, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { MantineReactTable } from "mantine-react-table";
import { usePGlite } from "@electric-sql/pglite-react";
import { TableManager } from "./table-manager/table-manager.tsx";
import { useCsvImportStore } from "./table-manager/csv-import.store.ts";
import { CSVModal } from "./table-manager/csv-modal.tsx";
import { useDatabaseTablesTable } from "./use-database-tables-table.tsx";
import { dropAllTables } from "./table-manager/utils.ts";
import {
  TableMetadata,
  useDeleteUserProblemTableMutation,
  useFetchUserProblemTablesColumnTypes,
  useFetchUserProblemTableDataMutation,
  useUpdateUserProblemTableMutation,
} from "@/hooks/use-problem.ts";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";
import { showErrorNotification } from "@/components/notifications.ts";
import { sanitizeSqlIdentifier } from "@/utils/sql-name-sanitizer.ts";

export function ProblemDatabase() {
  const { id: problemId } = useParams({
    from: "/_admin/admin/problem/$id/database",
  });
  const { data: tableMetadata } =
    useFetchUserProblemTablesColumnTypes(problemId);
  const navigate = useNavigate();

  const nextStep = () => {
    navigate({
      to: `/admin/problem/$id/create`,
      params: { id: problemId },
    });
  };

  return (
    <Paper p={20}>
      <Stack>
        <Group justify="space-between" align="center">
          <Title>Database Tables</Title>
        </Group>
        <TableManager />
        <DatabaseTable tableMetadata={tableMetadata} problemId={problemId} />
      </Stack>
      <Group justify="flex-end" align="center" mt={20}>
        <Button color="blue" onClick={nextStep}>
          Next Step
        </Button>
      </Group>
      <CSVModal />
    </Paper>
  );
}

interface DatabaseTableProps {
  tableMetadata: TableMetadata[];
  problemId: string;
}

function DatabaseTable({ tableMetadata, problemId }: DatabaseTableProps) {
  const db = usePGlite();
  const [
    columnsDrawerOpened,
    { open: openColumnsDrawer, close: closeColumnsDrawer },
  ] = useDisclosure();

  const [columnsDrawerTable, setColumnsDrawerTable] = useState<{
    tableName: string;
    columnTypes: ColumnType[];
    relations: ForeignKeyMapping[];
  }>({
    tableName: "",
    columnTypes: [],
    relations: [],
  });

  const { mutate: fetchTableData } = useFetchUserProblemTableDataMutation();
  const { mutate: deleteTable } = useDeleteUserProblemTableMutation();
  const { mutate: updateTable } = useUpdateUserProblemTableMutation();

  const handleEdit = useCallback(
    (table: TableMetadata) => {
      fetchTableData(table.tableId, {
        onSuccess: (data) => {
          useCsvImportStore.getState().openExisting({
            tableId: table.tableId,
            fileName: data.table_name,
            columns: table.columnTypes.map((c) => c.column),
            rawData: data.rawData,
            columnTypes: table.columnTypes,
            relations: data.relations,
            description: table.description,
            tableMetadata: tableMetadata,
          });
        },
      });
    },
    [fetchTableData, tableMetadata],
  );

  const handleDelete = useCallback(
    (tableId: string) => {
      // Find the table name from metadata to drop from PGlite
      const tableToDelete = tableMetadata.find((t) => t.tableId === tableId);
      const tableName = tableToDelete?.tableName;

      if (!tableName) {
        showErrorNotification({
          title: "Failed to delete table",
          message: "Table not found",
        });
        return;
      }

      // Check if any other table references this table via foreign key
      const referencingTables = tableMetadata.filter(
        (t) =>
          t.tableId !== tableId &&
          t.relations.some((r) => r.foreignTableName === tableName),
      );

      if (referencingTables.length > 0) {
        const referencingNames = referencingTables
          .map((t) => `"${t.tableName}"`)
          .join(", ");
        showErrorNotification({
          title: "Cannot delete table",
          message: `Table "${tableName}" is referenced by ${referencingNames}. Delete the referencing table(s) first or remove the foreign key relationship.`,
        });
        return;
      }

      deleteTable(
        { tableId, problemId },
        {
          onSuccess: () => {
            // Also drop the table from PGlite
            if (tableName) {
              dropAllTables(db, [tableName]).catch((error: unknown) => {
                console.error("Failed to drop table from PGlite:", error);
              });
            }
          },
          onError: (error) => {
            showErrorNotification({
              title: "Failed to delete table",
              message: error.message,
            });
          },
        },
      );
    },
    [deleteTable, problemId, tableMetadata, db],
  );

  const handleViewColumns = useCallback(
    (table: TableMetadata) => {
      setColumnsDrawerTable({
        tableName: table.tableName,
        columnTypes: table.columnTypes,
        relations: table.relations,
      });
      openColumnsDrawer();
    },
    [openColumnsDrawer],
  );

  const handleCloseColumnsDrawer = useCallback(() => {
    closeColumnsDrawer();
    setColumnsDrawerTable({ tableName: "", columnTypes: [], relations: [] });
  }, [closeColumnsDrawer]);

  const handleUpdateTable = useCallback(
    (
      tableId: string,
      field: "tableName" | "description",
      value: string,
      oldValue?: string,
    ) => {
      // Sanitize table name if updating table name field
      const sanitizedValue =
        field === "tableName" ? sanitizeSqlIdentifier(value) : value;

      updateTable(
        {
          tableId,
          problemId,
          ...(field === "tableName"
            ? { tableName: sanitizedValue, oldTableName: oldValue }
            : { description: sanitizedValue }),
        },
        {
          onSuccess: () => {
            // Update the store's table metadata and relations when table name changes
            if (
              field === "tableName" &&
              oldValue &&
              sanitizedValue !== oldValue
            ) {
              useCsvImportStore
                .getState()
                .updateTableName(oldValue, sanitizedValue);
            }
          },
          onError: (error) => {
            showErrorNotification({
              title: `Failed to update ${field === "tableName" ? "table name" : "description"}`,
              message: error.message,
            });
          },
        },
      );
    },
    [updateTable, problemId],
  );

  const { table } = useDatabaseTablesTable({
    data: tableMetadata,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewColumns: handleViewColumns,
    onUpdateTable: handleUpdateTable,
  });

  return (
    <>
      {tableMetadata.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text ta="center" c="dimmed">
            No tables yet. Upload a CSV file above to create your first table.
          </Text>
        </Paper>
      ) : (
        <MantineReactTable table={table} />
      )}

      <ColumnMetadataDrawer
        tableName={columnsDrawerTable.tableName}
        columnTypes={columnsDrawerTable.columnTypes}
        relations={columnsDrawerTable.relations}
        opened={columnsDrawerOpened}
        onClose={handleCloseColumnsDrawer}
      />
    </>
  );
}

interface ColumnMetadataDrawerProps {
  tableName: string;
  columnTypes: ColumnType[];
  relations: ForeignKeyMapping[];
  opened: boolean;
  onClose: () => void;
}

function ColumnMetadataDrawer({
  tableName,
  columnTypes,
  relations,
  opened,
  onClose,
}: ColumnMetadataDrawerProps) {
  return (
    <Drawer
      title={
        <>
          Column Metadata for <Code>{tableName}</Code>
        </>
      }
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
    >
      <Drawer.Body>
        {columnTypes.length === 0 ? (
          <Text c="dimmed">No columns to display.</Text>
        ) : (
          <Stack>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Column Name</Table.Th>
                  <Table.Th>Data Type</Table.Th>
                  <Table.Th>Primary Key</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {columnTypes.map((column) => (
                  <Table.Tr key={column.column}>
                    <Table.Td>{column.column}</Table.Td>
                    <Table.Td>
                      <Code>{column.type}</Code>
                    </Table.Td>
                    <Table.Td>
                      {column.isPrimaryKey ? <IconCheck /> : <IconX />}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {relations.length > 0 && (
              <Paper p="md" withBorder>
                <Title order={6} mb="sm">
                  Foreign Key Relations
                </Title>
                <Stack gap="xs">
                  {relations.map((relation, index) => (
                    <Group key={index} gap="xs">
                      <Code>
                        {relation.baseTableName}.{relation.baseColumnName}
                      </Code>
                      <IconArrowRight size={16} />
                      <Code>
                        {relation.foreignTableName}.
                        {relation.foreignTableColumn}
                      </Code>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Drawer.Body>
    </Drawer>
  );
}

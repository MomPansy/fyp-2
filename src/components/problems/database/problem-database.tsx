import {
  ActionIcon,
  Button,
  Code,
  Drawer,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { IconCheck, IconEdit, IconTrash, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { TableManager } from "./table-manager/table-manager.tsx";
import { useCsvImportStore } from "./table-manager/csv-import.store.ts";
import { CSVModal } from "./table-manager/csv-modal.tsx";
import {
  TableMetadata,
  useDeleteProblemTableMutation,
  useFetchProblemTablesColumnTypes,
  useFetchTableDataMutation,
} from "@/hooks/use-problem.ts";
import { ColumnType } from "server/drizzle/_custom.ts";
import { showErrorNotification } from "@/components/notifications.ts";

export function ProblemDatabase() {
  const { id: problemId } = useParams({
    from: "/_admin/admin/problem/$id/database",
  });
  const { data: tableMetadata } = useFetchProblemTablesColumnTypes(problemId);
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
        <DatabaseTable tableMetadata={tableMetadata} />
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
}

function DatabaseTable({ tableMetadata }: DatabaseTableProps) {
  const params = useParams({
    from: "/_admin/admin/problem/$id/database",
  });

  const [
    deleteConfirmationModalOpened,
    { open: openConfirmationModal, close: closeConfirmationModal },
  ] = useDisclosure();

  const [
    columnsDrawerOpened,
    { open: openColumnsDrawer, close: closeColumnsDrawer },
  ] = useDisclosure();

  const [columnsDrawerTable, setColumnsDrawerTable] = useState<ColumnType[]>(
    [],
  );

  const handleViewColumns = (columnTypes: ColumnType[] | undefined) => {
    if (!columnTypes) return;
    setColumnsDrawerTable(columnTypes);
    openColumnsDrawer();
  };

  const handleCloseColumnsDrawer = () => {
    closeColumnsDrawer();
    setColumnsDrawerTable([]);
  };

  const { mutate } = useFetchTableDataMutation();
  const { mutate: deleteTable } = useDeleteProblemTableMutation();

  const handleEdit = (table: TableMetadata) => {
    const tableId = table.tableId;
    mutate(tableId, {
      onSuccess: (data) => {
        useCsvImportStore.getState().openExisting({
          tableId: tableId,
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
  };

  const [tableToDelete, setTableToDelete] = useState<string | null>(null);

  const handleDeleteClick = (tableId: string) => {
    setTableToDelete(tableId);
    openConfirmationModal();
  };

  const handleDeleteConfirm = () => {
    if (tableToDelete) {
      deleteTable(
        { tableId: tableToDelete, problemId: params.id },
        {
          onError: (error) => {
            showErrorNotification({
              title: "Failed to delete table",
              message: error.message,
            });
          },
          onSuccess: () => {
            closeConfirmationModal();
            setTableToDelete(null);
          },
        },
      );
    }
  };

  const handleDeleteCancel = () => {
    closeConfirmationModal();
    setTableToDelete(null);
  };

  return (
    <>
      <Table withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Table Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Rows</Table.Th>
            <Table.Th>Columns</Table.Th>
            <Table.Th>Action</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody bg="hf-grey">
          {tableMetadata.map((table) => (
            <Table.Tr key={table.tableName}>
              <Table.Td>{table.tableName}</Table.Td>
              <Table.Td>{table.description || "Table Description"}</Table.Td>
              <Table.Td>{table.numberOfRows || "N/A"}</Table.Td>
              <Table.Td>
                <Button
                  variant="gradient"
                  onClick={() => handleViewColumns(table.columnTypes)}
                  disabled={!table.columnTypes}
                >
                  {table.columnTypes.length > 0 ? table.columnTypes.length : 0}
                  &nbsp; Columns
                </Button>
              </Table.Td>
              <Table.Td>
                <Group justify="space-between" w="5rem">
                  <ActionIcon
                    variant="subtle"
                    onClick={() => handleEdit(table)}
                  >
                    <IconEdit />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => handleDeleteClick(table.tableId)}
                    c="red"
                  >
                    <IconTrash />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <DeleteConfirmationModal
        isOpened={deleteConfirmationModalOpened}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
      <ColumnMetadataDrawer
        columnTypes={columnsDrawerTable}
        opened={columnsDrawerOpened}
        onClose={handleCloseColumnsDrawer}
      />
    </>
  );
}

function DeleteConfirmationModal({
  isOpened,
  onClose,
  onConfirm,
}: {
  isOpened: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      opened={isOpened}
      onClose={onClose}
      title="Confirm Deletion"
      centered
    >
      <Modal.Body p="0">
        <Stack>
          <p>
            Are you sure you want to delete this table? This action cannot be
            undone.
          </p>
          <Group justify="flex-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button color="red" onClick={onConfirm}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal.Body>
    </Modal>
  );
}

interface ColumnMetadataDrawerProps {
  columnTypes: ColumnType[];
  opened: boolean;
  onClose: () => void;
}

function ColumnMetadataDrawer({
  columnTypes,
  opened,
  onClose,
}: ColumnMetadataDrawerProps) {
  return (
    <Drawer
      title="Column Metadata"
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
    >
      <Drawer.Body>
        {columnTypes.length === 0 ? (
          <p>No columns to display.</p>
        ) : (
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Column Name</Table.Th>
                <Table.Th>Data Type</Table.Th>
                <Table.Th>Primary Key</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody bg="hf-grey">
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
        )}
      </Drawer.Body>
    </Drawer>
  );
}

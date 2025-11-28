import { useMemo, useState, useCallback } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Button, Tooltip, Text, Code } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useMantineReactTable, type MRT_ColumnDef } from "mantine-react-table";
import type { TableMetadata } from "@/hooks/use-problem.ts";

interface UseDatabaseTablesTableOptions {
  data: TableMetadata[];
  onEdit: (table: TableMetadata) => void;
  onDelete: (tableId: string) => void;
  onViewColumns: (table: TableMetadata) => void;
  onUpdateTable: (
    tableId: string,
    field: "tableName" | "description",
    value: string,
    oldValue?: string,
  ) => void;
}

export function useDatabaseTablesTable({
  data,
  onEdit,
  onDelete,
  onViewColumns,
  onUpdateTable,
}: UseDatabaseTablesTableOptions) {
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const openDeleteConfirmation = useCallback(
    (tableId: string) => {
      setTableToDelete(tableId);
      openDeleteModal();
    },
    [openDeleteModal],
  );

  const handleConfirmDelete = useCallback(() => {
    if (tableToDelete !== null) {
      onDelete(tableToDelete);
      setTableToDelete(null);
      closeDeleteModal();
    }
  }, [tableToDelete, closeDeleteModal, onDelete]);

  const columns = useMemo<MRT_ColumnDef<TableMetadata>[]>(
    () => [
      {
        accessorKey: "tableName",
        header: "Table Name",
        enableEditing: true,
        Cell: ({ cell }) => <Code>{cell.getValue<string>()}</Code>,
        mantineEditTextInputProps: ({ row }) => ({
          onBlur: (event) => {
            const value = event.currentTarget.value;
            const oldValue = row.original.tableName;
            if (value !== oldValue) {
              onUpdateTable(row.original.tableId, "tableName", value, oldValue);
            }
          },
        }),
      },
      {
        accessorKey: "description",
        header: "Description",
        enableEditing: true,
        Cell: ({ cell }) => (
          <Text size="sm" c={cell.getValue<string>() ? undefined : "dimmed"}>
            {cell.getValue<string>() || "No description"}
          </Text>
        ),
        mantineEditTextInputProps: ({ row }) => ({
          onBlur: (event) => {
            const value = event.currentTarget.value;
            if (value !== row.original.description) {
              onUpdateTable(row.original.tableId, "description", value);
            }
          },
        }),
      },
      {
        accessorKey: "numberOfRows",
        header: "Rows",
        enableEditing: false,
        Cell: ({ cell }) => (
          <Text size="sm">{cell.getValue<number>() || "N/A"}</Text>
        ),
      },
      {
        id: "columns",
        header: "Columns",
        enableEditing: false,
        Cell: ({ row }) => (
          <Tooltip label="View Columns">
            <Button
              variant="light"
              size="sm"
              onClick={() => onViewColumns(row.original)}
              disabled={row.original.columnTypes.length === 0}
            >
              {row.original.columnTypes.length} Columns
            </Button>
          </Tooltip>
        ),
      },
    ],
    [onViewColumns, onUpdateTable],
  );

  const table = useMantineReactTable({
    columns,
    data,
    editDisplayMode: "cell",
    enableEditing: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    enablePagination: false,
    enableColumnActions: false,
    enableSorting: false,
    enableTopToolbar: false,
    renderRowActions: ({ row }) => (
      <ActionIcon.Group>
        <Tooltip label="Edit Table Data">
          <ActionIcon variant="subtle" onClick={() => onEdit(row.original)}>
            <IconEdit size={32} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete Table">
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => openDeleteConfirmation(row.original.tableId)}
          >
            <IconTrash size={32} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>
    ),
    mantineTableContainerProps: {
      style: { maxHeight: "35rem", overflow: "auto" },
    },
    mantineTableProps: {
      withTableBorder: true,
      striped: true,
    },
  });

  return {
    table,
    deleteModal: {
      opened: deleteModalOpened,
      close: closeDeleteModal,
      onConfirm: handleConfirmDelete,
    },
  };
}

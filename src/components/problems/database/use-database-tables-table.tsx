import { useMemo, useCallback } from "react";
import { ActionIcon, Button, Menu, Text, Code } from "@mantine/core";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useMantineReactTable, type MRT_ColumnDef } from "mantine-react-table";
import type { TableMetadata } from "@/hooks/use-problem.ts";
import { openDeleteConfirmModal } from "@/lib/modals.tsx";

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
  const openDeleteConfirmation = useCallback(
    (table: TableMetadata) => {
      openDeleteConfirmModal({
        itemName: table.tableName,
        title: "Delete Table",
        onConfirm: () => onDelete(table.tableId),
      });
    },
    [onDelete],
  );

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
          <Button
            variant="light"
            size="sm"
            onClick={() => onViewColumns(row.original)}
            disabled={row.original.columnTypes.length === 0}
          >
            {row.original.columnTypes.length} Columns
          </Button>
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
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle">
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconEdit size={16} />}
            onClick={() => onEdit(row.original)}
          >
            Edit Table Data
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTrash size={16} />}
            color="red"
            onClick={() => openDeleteConfirmation(row.original)}
          >
            Delete Table
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
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
  };
}

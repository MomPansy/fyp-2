import { useMemo, useState, useCallback } from "react";
import { useDisclosure } from "@mantine/hooks";
import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMantineReactTable, type MRT_ColumnDef } from "mantine-react-table";
import type { Row } from "@/components/problems/database/table-manager/csv-import.store.ts";

// Default columns for the candidate table
const DEFAULT_COLUMNS: MRT_ColumnDef<Row>[] = [
  { accessorKey: "email", header: "email" },
  { accessorKey: "full_name", header: "full_name" },
  { accessorKey: "matriculation_number", header: "matriculation_number" },
];

interface UseCandidatesTableOptions {
  initialData: Row[];
}

export function useCandidatesTable({ initialData }: UseCandidatesTableOptions) {
  const [candidates, setCandidates] = useState<Row[]>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<number | null>(
    null,
  );
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  // Wrapper to set candidates and mark as dirty
  const updateCandidates = useCallback(
    (updater: Row[] | ((prev: Row[]) => Row[])) => {
      setCandidates(updater);
      setIsDirty(true);
    },
    [],
  );

  // Generate columns from data keys, fallback to defaults
  const columns = useMemo<MRT_ColumnDef<Row>[]>(() => {
    if (candidates.length === 0) return DEFAULT_COLUMNS;
    const keys = Object.keys(candidates[0]);
    return keys.map((key) => ({
      accessorKey: key,
      header: key,
    }));
  }, [candidates]);

  const handleCreateCandidate = useCallback(
    ({
      values,
      exitCreatingMode,
    }: {
      values: Row;
      exitCreatingMode: () => void;
    }) => {
      updateCandidates((prev) => [values, ...prev]);
      exitCreatingMode();
    },
    [updateCandidates],
  );

  const openDeleteConfirmation = useCallback(
    (rowIndex: number) => {
      setCandidateToDelete(rowIndex);
      openDeleteModal();
    },
    [openDeleteModal],
  );

  const handleConfirmDelete = useCallback(() => {
    if (candidateToDelete !== null) {
      updateCandidates((prev) =>
        prev.filter((_, i) => i !== candidateToDelete),
      );
      setCandidateToDelete(null);
      closeDeleteModal();
    }
  }, [candidateToDelete, closeDeleteModal, updateCandidates]);

  const table = useMantineReactTable({
    columns,
    data: candidates,
    createDisplayMode: "row",
    editDisplayMode: "cell",
    enableEditing: true,
    onCreatingRowSave: handleCreateCandidate,
    enableRowActions: true,
    enablePagination: false,
    renderRowActions: ({ row }) => (
      <Tooltip label="Delete">
        <ActionIcon
          color="red"
          onClick={() => openDeleteConfirmation(row.index)}
        >
          <IconTrash />
        </ActionIcon>
      </Tooltip>
    ),
    mantineTableContainerProps: {
      style: { maxHeight: "35rem", overflow: "auto" },
    },
    mantineTableFooterProps: {
      style: { padding: "1rem" },
    },
    mantineTopToolbarProps: {
      style: {
        padding: "1rem",
        display: "flex",
        justifyContent: "space-between",
      },
    },
    positionToolbarAlertBanner: "none",
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={() => table.setCreatingRow(true)}
        variant="light"
      >
        Create Candidate
      </Button>
    ),
  });

  return {
    table,
    candidates,
    setCandidates: updateCandidates,
    isDirty,
    setIsDirty,
    deleteModal: {
      opened: deleteModalOpened,
      close: closeDeleteModal,
      onConfirm: handleConfirmDelete,
    },
  };
}

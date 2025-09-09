import {
  ActionIcon,
  Button,
  Group,
  LoadingOverlay,
  Modal,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconArrowsUpDown,
  IconEdit,
  IconFilter,
  IconTrash,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState, useEffect } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  ProblemListFilters,
  ProblemListSorting,
  problemLibraryKeys,
} from "@/components/problems-library/query-keys.ts";
import {
  useProblemsQuery,
  fetchProblemsPage,
} from "@/components/problems-library/hooks.ts";
import {
  problemDetailQueryOptions,
  useDeleteProblemMutation,
} from "@/hooks/use-problem.ts";
import { showErrorNotification } from "@/components/notifications.ts";
import { SimpleEditor } from "@/components/tiptap/simple/simple-editor.tsx";

export const Route = createFileRoute("/_admin/admin/problemslibrary")({
  component: RouteComponent,
});

function RouteComponent() {
  const [filters, setFilters] = useState<ProblemListFilters>({
    search: undefined,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sorting, setSorting] = useState<ProblemListSorting>({
    sortOptions: [{ sortBy: "created_at", order: "desc" }],
  });

  return (
    <Stack maw="80rem" mx="auto" mt="2rem">
      <Header filters={filters} setFilters={setFilters} />
      <List filters={filters} sorting={sorting} />
    </Stack>
  );
}

function TableSkeleton() {
  return (
    <Paper withBorder shadow="sm">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Problem Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Created At</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 3 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td>
                <Skeleton height={20} width="80%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="90%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="50%" />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

interface HeaderProps {
  filters: ProblemListFilters;
  setFilters: (filters: ProblemListFilters) => void;
}

function Header({ filters, setFilters }: HeaderProps) {
  return (
    <Group>
      <TextInput
        placeholder="Search problems..."
        value={filters.search ?? ""}
        onChange={(e) =>
          setFilters({ ...filters, search: e.currentTarget.value })
        }
        size="sm"
        maw="20rem"
      />
      <ActionIcon variant="subtle">
        <IconArrowsUpDown />
      </ActionIcon>
      <ActionIcon variant="subtle">
        <IconFilter />
      </ActionIcon>
    </Group>
  );
}

interface ListProps {
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
}

function List({ filters, sorting }: ListProps) {
  // Suspense boundary now wraps only the data-dependent subtree; fallback provides full Table structure
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ListContent filters={filters} sorting={sorting} />
    </Suspense>
  );
}

function ListContent({ filters, sorting }: ListProps) {
  const { mutate } = useDeleteProblemMutation();
  const pageSize = 20; //can be adjusted
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const debouncedFilters =
    filters.search === debouncedSearch
      ? filters
      : { ...filters, search: debouncedSearch };
  const [currentPage, setCurrentPage] = useState(1);
  const { data } = useProblemsQuery(
    debouncedFilters,
    sorting,
    pageSize,
    currentPage - 1,
  );
  const { items, totalPages } = data;
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [
    deleteConfirmationModalOpened,
    { open: openConfirmationModal, close: closeConfirmationModal },
  ] = useDisclosure();

  const [problemToDelete, setProblemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handlePageHover = (page: number) => {
    // Only prefetch if it's not the current page
    if (page !== currentPage) {
      const pageIndex = page - 1; // Convert to 0-based index
      queryClient.prefetchQuery({
        queryKey: problemLibraryKeys.listParams(
          debouncedFilters,
          sorting,
          pageIndex,
        ),
        queryFn: () =>
          fetchProblemsPage({
            filters: debouncedFilters,
            sorting,
            pageIndex,
            pageSize,
          }),
      });
    }
  };

  const handleControlHover = (control: string) => {
    let targetPage: number | null = null;

    if (control === "next" && currentPage < totalPages) {
      targetPage = currentPage + 1;
    } else if (control === "previous" && currentPage > 1) {
      targetPage = currentPage - 1;
    } else if (control === "first") {
      targetPage = 1;
    } else if (control === "last") {
      targetPage = totalPages;
    }

    if (targetPage && targetPage !== currentPage) {
      const pageIndex = targetPage - 1; // Convert to 0-based index
      queryClient.prefetchQuery({
        queryKey: problemLibraryKeys.listParams(
          debouncedFilters,
          sorting,
          pageIndex,
        ),
        queryFn: () =>
          fetchProblemsPage({
            filters: debouncedFilters,
            sorting,
            pageIndex,
            pageSize,
          }),
      });
    }
  };

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  );
  const deselectProblem = () => setSelectedProblemId(null);

  const reset = () => {
    deselectProblem();
  };

  const handleDeleteClick = (problem: { id: string; name: string }) => {
    setProblemToDelete(problem);
    openConfirmationModal();
  };

  const handleDeleteConfirm = () => {
    if (problemToDelete) {
      mutate(
        {
          problemId: problemToDelete.id,
        },
        {
          onError: (error) => {
            showErrorNotification({
              title: "Failed to delete problem",
              message: error.message,
            });
          },
          onSuccess: () => {
            reset();
            closeConfirmationModal();
            setProblemToDelete(null);
          },
        },
      );
    }
  };

  const handleDeleteCancel = () => {
    closeConfirmationModal();
    setProblemToDelete(null);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters.search]);

  return (
    <>
      <Paper withBorder shadow="sm">
        <Table highlightOnHover striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Problem Name</Table.Th>
              <Table.Th>Summary</Table.Th>
              <Table.Th>Created At</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((problem) => (
              <Table.Tr
                key={problem.id}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  // Prevent row click when clicking on the button
                  if (!e.defaultPrevented) {
                    setSelectedProblemId(problem.id);
                  }
                }}
              >
                <Table.Td>{problem.name}</Table.Td>
                <Table.Td>Summary</Table.Td>
                <Table.Td>231231</Table.Td>
                <Table.Td>
                  <Button
                    leftSection={<IconEdit />}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate({
                        to: "/admin/problem/$id/details",
                        params: { id: problem.id },
                      });
                    }}
                    variant="light"
                  >
                    Edit
                  </Button>
                  <Button
                    leftSection={<IconTrash />}
                    color="red"
                    ml={10}
                    variant="light"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteClick({ id: problem.id, name: problem.name });
                    }}
                  >
                    Delete
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
          <Table.Caption>
            <Group justify="flex-end">
              <Pagination
                total={totalPages}
                onChange={setCurrentPage}
                value={currentPage}
                p="xs"
                withEdges
                getItemProps={(page) => ({
                  onMouseEnter: () => handlePageHover(page),
                })}
                getControlProps={(control) => ({
                  onMouseEnter: () => handleControlHover(control),
                })}
              />
            </Group>
          </Table.Caption>
        </Table>
      </Paper>
      {selectedProblemId && (
        <Suspense fallback={<LoadingOverlay />}>
          <ProblemPreviewModal
            onClose={deselectProblem}
            problemId={selectedProblemId}
          />
        </Suspense>
      )}
      <DeleteConfirmationModal
        isOpened={deleteConfirmationModalOpened}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        problemName={problemToDelete?.name}
      />
    </>
  );
}

function DeleteConfirmationModal({
  isOpened,
  onClose,
  onConfirm,
  problemName,
}: {
  isOpened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  problemName?: string;
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
            Are you sure you want to delete the problem &nbsp;
            <strong>"{problemName}"</strong>? This action cannot be undone.
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

interface ProblemPreviewModalProps {
  problemId: string;
  onClose: () => void;
}

function ProblemPreviewModal({ onClose, problemId }: ProblemPreviewModalProps) {
  const { data: problem } = useSuspenseQuery(
    problemDetailQueryOptions(problemId, { columns: ["name", "description"] }),
  );

  if (!problem) {
    showErrorNotification({
      title: "Problem Not Found",
      message: "The requested problem does not exist.",
    });
    onClose();
    return null;
  }

  return (
    <Modal opened={true} onClose={onClose} size="auto" title={problem.name}>
      <Modal.Body>
        <SimpleEditor
          initialContent={problem.description}
          readonly
          styles={{
            editor: { maxWidth: "1400px", padding: 0 },
          }}
          showToolbar={false}
        />
      </Modal.Body>
    </Modal>
  );
}

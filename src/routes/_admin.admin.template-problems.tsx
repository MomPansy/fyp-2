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
import { useDebouncedValue } from "@mantine/hooks";
import { IconArrowsUpDown, IconFilter } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  ProblemListFilters,
  ProblemListSorting,
  templateProblemKeys,
} from "@/components/template-problems/query-keys.ts";
import {
  useUserProblemsQuery,
  fetchUserProblemsPage,
  useFetchProblemDetails,
  useApplyTemplateMutation,
} from "@/components/template-problems/hooks.ts";
import { dayjs } from "@/lib/dayjs.ts";
import { SimpleEditor } from "@/components/tiptap/simple/simple-editor.tsx";
import { showErrorNotification } from "@/components/notifications.ts";

const templateProblemSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_admin/admin/template-problems")({
  component: RouteComponent,
  validateSearch: zodValidator(templateProblemSearchSchema),
});

function RouteComponent() {
  const [filters, setFilters] = useState<ProblemListFilters>({
    search: undefined,
  });
  const [sorting] = useState<ProblemListSorting>({
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
  const { id } = Route.useSearch();
  const { mutate, isPending } = useApplyTemplateMutation();
  const pageSize = 20; //can be adjusted
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const debouncedFilters =
    filters.search === debouncedSearch
      ? filters
      : { ...filters, search: debouncedSearch };
  const [currentPage, setCurrentPage] = useState(1);
  const { data } = useUserProblemsQuery(
    debouncedFilters,
    sorting,
    pageSize,
    currentPage - 1,
  );
  const { items, totalPages } = data;
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const handlePageHover = (page: number) => {
    // Only prefetch if it's not the current page
    if (page !== currentPage) {
      const pageIndex = page - 1; // Convert to 0-based index
      queryClient.prefetchQuery({
        queryKey: templateProblemKeys.listParams(
          debouncedFilters,
          sorting,
          pageIndex,
        ),
        queryFn: () =>
          fetchUserProblemsPage({
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
        queryKey: templateProblemKeys.listParams(
          debouncedFilters,
          sorting,
          pageIndex,
        ),
        queryFn: () =>
          fetchUserProblemsPage({
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

  const deselectProblem = () => {
    setSelectedProblemId(null);
    // If the problem was opened via URL, clear the ID from the search params
    navigate({
      to: Route.to, // ✅ use the file route helper, not "/admin/..."
      search: (prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = prev; // Remove the id key entirely
        return rest;
      },
      replace: true,
    });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters.search]);

  // Auto-open preview modal when ID is provided in search and data is fetched
  useEffect(() => {
    if (id && items.length > 0) {
      const exists = items.some((p) => p.id === id);
      if (exists && selectedProblemId !== id) setSelectedProblemId(id);
    } else if (!id && selectedProblemId) {
      setSelectedProblemId(null);
    }
  }, [id, items, selectedProblemId]);

  const handleUseTemplate = (problemId: string) => {
    mutate(
      { templateProblemId: problemId },
      {
        onSuccess: (data) => {
          navigate({
            to: "/admin/problem/$id/details",
            params: { id: data.userProblemId },
          });
        },
      },
    );
  };

  return (
    <>
      <Paper withBorder shadow="sm">
        <Table highlightOnHover striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Problem Name</Table.Th>
              {/* <Table.Th>Summary</Table.Th> */}
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
                {/* <Table.Td>Summary</Table.Td> */}
                <Table.Td>
                  {dayjs(problem.created_at).format("DD/MM/YYYY")}
                </Table.Td>
                <Table.Td>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUseTemplate(problem.id);
                    }}
                    loading={isPending}
                  >
                    Use Template
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
    </>
  );
}

interface ProblemPreviewModalProps {
  problemId: string;
  onClose: () => void;
}

function ProblemPreviewModal({ onClose, problemId }: ProblemPreviewModalProps) {
  const { data: templateProblem } = useFetchProblemDetails(problemId);

  if (!templateProblem) {
    showErrorNotification({
      title: "Problem Not Found",
      message: "The requested problem does not exist.",
    });
    onClose();
    return null;
  }

  return (
    <Modal
      opened={true}
      onClose={onClose}
      size="auto"
      title={templateProblem.name}
    >
      <Modal.Body>
        <SimpleEditor
          initialContent={templateProblem.description}
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

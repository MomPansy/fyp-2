import {
  ActionIcon,
  Button,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconArrowsUpDown,
  IconEdit,
  IconFilter,
  IconTrash,
} from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  ProblemListFilters,
  ProblemListSorting,
  myProblemKeys,
} from "@/components/my-problems/query-keys.ts";
import {
  useUserProblemsQuery,
  fetchUserProblemsPage,
} from "@/components/my-problems/hooks.ts";
import {
  userProblemDetailQueryOptions,
  useDeleteUserProblemMutation,
} from "@/hooks/use-problem.ts";
import { showErrorNotification } from "@/components/notifications.ts";
import { useUser } from "@/hooks/auth.ts";
import { dayjs } from "@/lib/dayjs.ts";
import { CustomAnchor } from "@/components/buttons/link-button.tsx";
import { generateUUID } from "@/lib/utils.ts";
import { ProblemPreviewModal } from "@/components/problems/problem-preview-modal.tsx";
import {
  openDeleteConfirmModal,
  openDeleteProblemWithAssessmentWarning,
} from "@/lib/modals.tsx";

const problemSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_admin/admin/problems")({
  component: RouteComponent,
  validateSearch: zodValidator(problemSearchSchema),
});

function RouteComponent() {
  const { id } = Route.useSearch();

  const [filters, setFilters] = useState<ProblemListFilters>({
    search: undefined,
    id: id,
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
  const createProblemId = useCallback(() => generateUUID(), []);

  return (
    <Group justify="space-between">
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
      <CustomAnchor
        to="/admin/problem/$id/details"
        params={{ id: createProblemId() }}
      >
        <Button>New Problem</Button>
      </CustomAnchor>
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
  const { user_id: userId } = useUser();
  const { mutate } = useDeleteUserProblemMutation();
  const pageSize = 20; //can be adjusted
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const debouncedFilters =
    filters.search === debouncedSearch
      ? filters
      : { ...filters, search: debouncedSearch };
  const [currentPage, setCurrentPage] = useState(1);
  const { data } = useUserProblemsQuery(
    userId,
    debouncedFilters,
    sorting,
    pageSize,
    currentPage - 1,
  );

  const { items, totalPages } = data;
  const navigate = useNavigate();
  const { id } = Route.useSearch();

  const queryClient = useQueryClient();

  const handlePageHover = (page: number) => {
    // Only prefetch if it's not the current page
    if (page !== currentPage) {
      const pageIndex = page - 1; // Convert to 0-based index
      queryClient.prefetchQuery({
        queryKey: myProblemKeys.listParams(
          debouncedFilters,
          sorting,
          pageIndex,
        ),
        queryFn: () =>
          fetchUserProblemsPage({
            userId,
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
        queryKey: myProblemKeys.listParams(
          debouncedFilters,
          sorting,
          pageIndex,
        ),
        queryFn: () =>
          fetchUserProblemsPage({
            userId,
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

  const reset = () => {
    deselectProblem();
  };

  const handleDeleteClick = (problem: { id: string; name: string }) => {
    openDeleteConfirmModal({
      itemName: problem.name,
      onConfirm: () => {
        mutate(
          { problemId: problem.id },
          {
            onError: (error) => {
              // Check if the error is due to assessment usage
              if (error.message.startsWith("ASSESSMENT_IN_USE:")) {
                const assessmentUsage = JSON.parse(
                  error.message.replace("ASSESSMENT_IN_USE:", ""),
                ) as { assessmentId: string; assessmentName: string }[];

                // Show warning modal about assessment usage
                openDeleteProblemWithAssessmentWarning({
                  problemName: problem.name,
                  assessments: assessmentUsage,
                  onConfirm: () => {
                    mutate(
                      { problemId: problem.id, removeFromAssessments: true },
                      {
                        onError: (err) => {
                          showErrorNotification({
                            title: "Failed to delete problem",
                            message: err.message,
                          });
                        },
                        onSuccess: () => {
                          reset();
                        },
                      },
                    );
                  },
                });
              } else {
                showErrorNotification({
                  title: "Failed to delete problem",
                  message: error.message,
                });
              }
            },
            onSuccess: () => {
              reset();
            },
          },
        );
      },
    });
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
              {/* <Table.Th>Summary</Table.Th> */}
              <Table.Th>Template</Table.Th>
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
                <Table.Td>
                  {problem.problems ? (
                    <CustomAnchor
                      to="/admin/template-problems"
                      search={{ id: problem.problems.id }}
                      size="sm"
                    >
                      <Button variant="light">{problem.problems.name}</Button>
                    </CustomAnchor>
                  ) : (
                    "-"
                  )}
                </Table.Td>
                {/* <Table.Td>Summary</Table.Td> */}
                <Table.Td>
                  {dayjs(problem.created_at).format("DD/MM/YYYY")}
                </Table.Td>
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
      {(() => {
        const problemId = selectedProblemId ?? id;
        if (!problemId) return null;
        return (
          <Suspense fallback={<LoadingOverlay />}>
            <ProblemPreviewModalWrapper
              onClose={deselectProblem}
              problemId={problemId}
            />
          </Suspense>
        );
      })()}
    </>
  );
}

interface ProblemPreviewModalWrapperProps {
  problemId: string;
  onClose: () => void;
}

function ProblemPreviewModalWrapper({
  onClose,
  problemId,
}: ProblemPreviewModalWrapperProps) {
  const { user_id: userId } = useUser();
  const { data: problem } = useSuspenseQuery(
    userProblemDetailQueryOptions(problemId, userId, {
      columns: ["name", "description"],
    }),
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
    <ProblemPreviewModal
      problem={{
        name: problem.name,
        description: problem.description,
      }}
      onClose={onClose}
    />
  );
}

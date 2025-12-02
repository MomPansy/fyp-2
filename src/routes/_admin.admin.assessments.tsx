/* eslint-disable prettier/prettier */
import {
  Button,
  Group,
  Table,
  Badge,
  Box,
  Flex,
  Center,
  Loader,
  Text,
  Stack,
  Paper,
  ScrollArea,
  Checkbox,
  ActionIcon,
  Menu,
} from "@mantine/core";
import { IconClock, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";
import { MiniCalendar } from "@mantine/dates"
import { AssessmentListFilters } from "@/components/assessments/query-keys.ts";
import {
  CreateAssessmentMutationProps,
  useCreateAssessmentMutation,
  useDeleteAssessmentMutation,
  useFetchAssessmentsInfinite,
} from "@/components/assessments/hooks.ts";
import { TableSkeleton } from "@/components/assessments/skeleton.tsx";
import { Filters } from "@/components/assessments/filters.tsx";
import { generateUUID } from "@/lib/utils.ts";
import { useUser } from "@/hooks/auth.ts";
import { getAssessmentStatus } from "@/components/assessments/utils.ts";
import { openDeleteConfirmModal } from "@/lib/modals.tsx";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/notifications.ts";

export const Route = createFileRoute("/_admin/admin/assessments")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <AssessmentPage />
    </Suspense>
  );
}

function AssessmentHeader() {
  const createProblemId = useCallback(() => generateUUID(), []);
  const { mutate } = useCreateAssessmentMutation();
  const { user_id } = useUser();
  const navigate = useNavigate();

  const handleCreateAssessment = () => {
    const newAssessment: CreateAssessmentMutationProps = {
      id: createProblemId(),
      name: "Untitled Assessment",
      duration: 60,
      user_id: user_id,
    };
    mutate(newAssessment, {
      onSuccess: (data) => {
        navigate({
          to: "/admin/assessment/$id/details",
          params: { id: data.id },
        });
      },
    });
  };

  return (
    <Group justify="flex-end">
      <Button onClick={handleCreateAssessment}>New Assessment</Button>
    </Group>
  );
}

function AssessmentPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AssessmentListFilters>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { mutate: deleteAssessments } = useDeleteAssessmentMutation();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useFetchAssessmentsInfinite({
    filters,
    sorting: { sortOptions: [{ sortBy: "created_at", order: "desc" }] },
    pageSize: 20,
  });

  // Auto-load more when scrolling near bottom
  const handleScrollPositionChange = () => {
    // Get the scroll container element
    const scrollContainer = document.querySelector(
      "[data-scroll-area-viewport]",
    );
    if (!scrollContainer || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const threshold = 100; // Trigger when 100px from bottom

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      fetchNextPage();
    }
  };

  const handleClick = (id: string) => {
    // Navigate to the assessment details page
    navigate({
      to: "/admin/assessment/$id/details",
      params: { id },
    });
  };

  const handleDeleteClick = (ids: string[]) => {
    openDeleteConfirmModal({
      itemName: ids.length === 1 ? "assessment" : "assessments",
      itemCount: ids.length,
      onConfirm: () => {
        deleteAssessments(
          { ids },
          {
            onSuccess: () => {
              // Remove deleted items from selected rows
              setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)));
              showSuccessNotification({
                title: "Assessment Deleted",
                message:
                  ids.length === 1
                    ? "The assessment has been deleted successfully."
                    : `${ids.length} assessments have been deleted successfully.`,
              });
            },
            onError: (error) => {
              showErrorNotification({
                title: "Cannot Delete Assessment",
                message: error.message,
              });
            },
          },
        );
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length > 0) {
      handleDeleteClick(selectedRows);
    }
  };

  if (error) {
    return (
      <Stack>
        <AssessmentHeader />
        <Center>
          <Text c="red">Error loading assessments: {error.message}</Text>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack h="100vh">
      <AssessmentHeader />
      <Group>
        <Filters filters={filters} setFilters={setFilters} w="20rem" />
        <Stack flex={1}>
          {selectedRows.length > 0 && (
            <Group>
              <Button
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleBulkDelete}
              >
                Delete {selectedRows.length} selected
              </Button>
            </Group>
          )}
          <Paper withBorder>
            <ScrollArea
              h={600}
              onScrollPositionChange={handleScrollPositionChange}
              scrollbars="y"
            >
              <Table highlightOnHover captionSide="bottom">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th />
                    <Table.Th style={{ minWidth: "400px" }}>
                      Assessment
                    </Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Duration</Table.Th>
                    <Table.Th>Date Scheduled</Table.Th>
                    <Table.Th>Not Attempted</Table.Th>
                    <Table.Th>Attempted</Table.Th>
                    <Table.Th>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Caption>
                  {data?.pages[0]?.totalCount !== undefined && (
                    <>
                      Showing&nbsp;
                      {data.pages.flatMap((page) => page.items).length}&nbsp;
                      of&nbsp;
                      {data.pages[0].totalCount} assessments
                    </>
                  )}
                </Table.Caption>
                <Table.Tbody>
                  {isLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Center py="xl">
                          <Loader />
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : data?.pages.flatMap((page) => page.items).length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Center py="xl">
                          <Text c="dimmed">No assessments found</Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    data?.pages
                      .flatMap((page) => page.items)
                      .map((assessment) => (
                        <Table.Tr
                          key={assessment.id}
                          bg={
                            selectedRows.includes(assessment.id)
                              ? "var(--mantine-color-blue-light)"
                              : undefined
                          }
                          style={{ cursor: "pointer" }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleClick(assessment.id);
                          }}
                        >
                          <Table.Td
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <Checkbox
                              aria-label="Select row"
                              checked={selectedRows.includes(assessment.id)}
                              onChange={(event) => {
                                setSelectedRows(
                                  event.currentTarget.checked
                                    ? [...selectedRows, assessment.id]
                                    : selectedRows.filter(
                                      (id) => id !== assessment.id,
                                    ),
                                )
                              }}
                            />
                          </Table.Td>
                          <Table.Td style={{ minWidth: "400px" }}>
                            <Flex align="flex-start" gap="md">
                              <Box>
                                <Group gap="xs" mb={4}>
                                  <Text fw={600} size="md">
                                    {assessment.name}
                                  </Text>
                                </Group>
                                <Text size="sm" c="dimmed" mb={8}>
                                  No description available
                                </Text>
                                <Flex gap="md" align="center">
                                  <Badge variant="light" size="sm">
                                    {assessment.assessment_problems.length}
                                    &nbsp;questions
                                  </Badge>
                                </Flex>
                              </Box>
                            </Flex>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              variant="light"
                              color={
                                getAssessmentStatus(assessment).color
                              }
                              size="lg"
                            >
                              {getAssessmentStatus(assessment).label}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <IconClock size={18} color="var(--mantine-color-blue-6)" />
                              <Text size="sm" fw={500}>
                                {assessment.duration
                                  ? `${assessment.duration} min`
                                  : "No limit"}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            {
                              !assessment.date_time_scheduled ? (
                                <Text size="sm" >
                                  Not Scheduled
                                </Text>
                              ) : <MiniCalendar
                                value={assessment.date_time_scheduled}
                                numberOfDays={1}
                                styles={{
                                  control: {
                                    display: "none"
                                  }
                                }}
                              />
                            }
                          </Table.Td>
                          <Table.Td>
                            <Text >
                              {(assessment.invitation_count ?? 0) - (assessment.attempted_count ?? 0)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text>
                              {assessment.attempted_count ?? 0}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Menu shadow="md" width={200} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon
                                  variant="subtle"
                                  size="lg"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                >
                                  <IconDotsVertical />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconEdit size={16} />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleClick(assessment.id);
                                  }}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={16} />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteClick([assessment.id]);
                                  }}
                                >
                                  Delete
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Table.Td>
                        </Table.Tr>
                      ))
                  )}
                </Table.Tbody>
              </Table>

              {/* Auto-load trigger */}
              {hasNextPage && (
                <Center py="md">
                  {isFetchingNextPage ? (
                    <Loader />
                  ) : (
                    <Button onClick={() => fetchNextPage()} variant="light">
                      Load More
                    </Button>
                  )}
                </Center>
              )}
            </ScrollArea>
          </Paper>
        </Stack>
      </Group>
    </Stack>
  );
}

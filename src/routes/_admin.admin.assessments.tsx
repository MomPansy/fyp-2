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
} from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";
import { dayjs } from "@/lib/dayjs.ts";
import { AssessmentListFilters } from "@/components/assessments/query-keys.ts";
import {
  CreateAssessmentMutationProps,
  useCreateAssessmentMutation,
  useFetchAssessmentsInfinite,
} from "@/components/assessments/hooks.ts";
import { TableSkeleton } from "@/components/assessments/skeleton.tsx";
import { Filters } from "@/components/assessments/filters.tsx";
import { generateUUID } from "@/lib/utils.ts";
import { useUser } from "@/hooks/auth.ts";

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
                    <Table.Th>Not Attempted</Table.Th>
                    <Table.Th>Completed</Table.Th>
                    <Table.Th>To Evaluate</Table.Th>
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
                          onClick={() => handleClick(assessment.id)}
                        >
                          <Table.Td>
                            <Checkbox
                              aria-label="Select row"
                              checked={selectedRows.includes(assessment.id)}
                              onChange={(event) =>
                                setSelectedRows(
                                  event.currentTarget.checked
                                    ? [...selectedRows, assessment.id]
                                    : selectedRows.filter(
                                      (id) => id !== assessment.id,
                                    ),
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td style={{ minWidth: "400px" }}>
                            <Flex align="flex-start" gap="md">
                              <Box>
                                <Text fw={600} size="md" mb={4}>
                                  {assessment.name}
                                </Text>
                                <Text size="sm" c="dimmed" mb={8}>
                                  No description available
                                </Text>
                                <Flex gap="md" align="center">
                                  <Badge variant="light" size="sm">
                                    {assessment.assessment_problems.length}
                                    &nbsp;questions
                                  </Badge>
                                  <Group gap="xs">
                                    <IconClock size={12} />
                                    <Text size="xs" c="dimmed">
                                      {assessment.duration
                                        ? `${assessment.duration} min`
                                        : "No time limit"}
                                    </Text>
                                  </Group>
                                  <Text size="xs" c="dimmed">
                                    {dayjs(assessment.created_at).format(
                                      "MMM D, YYYY",
                                    )}
                                  </Text>
                                </Flex>
                              </Box>
                            </Flex>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              TODO
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              TODO
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              TODO
                            </Text>
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

import {
  Button,
  Group,
  Table,
  Badge,
  Box,
  Flex,
  ActionIcon,
  Center,
  Loader,
  Text,
  Stack,
  Paper,
  ScrollArea,
} from "@mantine/core";
import { IconShare } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { dayjs } from "@/lib/dayjs.ts";
import { AssessmentListFilters } from "@/components/assessments/query-keys.ts";
import { useFetchAssessmentsInfinite } from "@/components/assessments/hooks.ts";
import { TableSkeleton } from "@/components/assessments/skeleton.tsx";
import { Filters } from "@/components/assessments/filters.tsx";

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
  return (
    <Group justify="flex-end">
      <Button>New Assessment</Button>
    </Group>
  );
}

function AssessmentPage() {
  const [filters, setFilters] = useState<AssessmentListFilters>({});
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
                      <Table.Td colSpan={4}>
                        <Center py="xl">
                          <Loader />
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : data?.pages.flatMap((page) => page.items).length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Center py="xl">
                          <Text c="dimmed">No assessments found</Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    data?.pages
                      .flatMap((page) => page.items)
                      .map((assessment) => (
                        <Table.Tr key={assessment.id}>
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
                                    {assessment.assessment_problems.length}{" "}
                                    questions
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {assessment.duration
                                      ? `${assessment.duration} min`
                                      : "No time limit"}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    Created{" "}
                                    {dayjs(assessment.created_at).format(
                                      "MMM D, YYYY",
                                    )}
                                  </Text>
                                </Flex>
                              </Box>
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                ml="auto"
                              >
                                <IconShare size={16} />
                              </ActionIcon>
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

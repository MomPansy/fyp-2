import {
  ActionIcon,
  Box,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconClock, IconEye } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { useAddAssessmentProblemMutation } from "../../hooks.ts";
import { ProblemBankListProps } from "./types.ts";
import { useUser } from "@/hooks/auth.ts";
import { dayjs } from "@/lib/dayjs.ts";
import { useUserProblemsInfinite } from "@/components/my-problems/hooks.ts";
import { showErrorNotification } from "@/components/notifications.ts";

export function ProblemBankList({
  filters,
  sorting,
  existingProblemIds,
  ...props
}: ProblemBankListProps) {
  const { user_id } = useUser();
  const { id } = useParams({ from: "/_admin/admin/assessment/$id/details" });
  const { mutate, isPending } = useAddAssessmentProblemMutation();
  const [selectedProblems, setSelectedProblems] = useState<string[]>(
    existingProblemIds ?? [],
  );
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useUserProblemsInfinite({
    userId: user_id,
    filters,
    sorting,
    pageSize: 20,
  });

  // Auto-load more when scrolling near bottom
  const handleScrollPositionChange = () => {
    const scrollContainer = document.querySelector(
      "[data-scroll-area-viewport]",
    );
    if (!scrollContainer || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const threshold = 100;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      fetchNextPage();
    }
  };

  const handleAddAssessmentProblems = () => {
    mutate(
      {
        assessment: id,
        problems: selectedProblems,
      },
      {
        onSuccess: () => {
          setSelectedProblems([]);
        },
        onError: (error) => {
          showErrorNotification({
            title: "Error adding problems",
            message: error.message,
          });
        },
      },
    );
  };

  if (error) {
    return (
      <Stack>
        <Center>
          <Text c="red">Error loading problems: {error.message}</Text>
        </Center>
      </Stack>
    );
  }

  return (
    <Paper withBorder {...props}>
      <Stack>
        <ScrollArea
          h={600}
          onScrollPositionChange={handleScrollPositionChange}
          scrollbars="y"
        >
          <Table highlightOnHover captionSide="bottom">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Group justify="space-between" align="center">
                    Problem
                    <Button
                      size="sm"
                      variant="filled"
                      onClick={handleAddAssessmentProblems}
                      disabled={selectedProblems.length === 0}
                      loading={isPending}
                    >
                      Add
                    </Button>
                  </Group>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Caption>
              {data?.pages[0]?.totalCount !== undefined && (
                <>
                  Showing&nbsp;
                  {data.pages.flatMap((page) => page.items).length}&nbsp;
                  of&nbsp;
                  {data.pages[0].totalCount} problems
                </>
              )}
            </Table.Caption>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={1}>
                    <Center py="xl">
                      <Loader />
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : data?.pages.flatMap((page) => page.items).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={1}>
                    <Center py="xl">
                      <Text c="dimmed">No problems found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data?.pages
                  .flatMap((page) => page.items)
                  .map((problem) => (
                    <Table.Tr
                      key={problem.id}
                      style={{ cursor: "pointer" }}
                      bg={
                        selectedProblems.includes(problem.id)
                          ? "var(--mantine-color-blue-light)"
                          : undefined
                      }
                      onClick={() => {
                        // Toggle checkbox selection
                        setSelectedProblems((prevSelected) =>
                          prevSelected.includes(problem.id)
                            ? prevSelected.filter((id) => id !== problem.id)
                            : [...prevSelected, problem.id],
                        );
                      }}
                    >
                      <Table.Td>
                        <Box>
                          <Group justify="space-between" align="center">
                            <Group>
                              <Stack gap="xs">
                                <Text fw={600} size="sm">
                                  {problem.name}
                                </Text>
                                <Group gap="xs">
                                  <IconClock size={12} />
                                  <Text size="xs" c="dimmed">
                                    {dayjs(problem.created_at).format(
                                      "MMM D, YYYY",
                                    )}
                                  </Text>
                                </Group>
                              </Stack>
                              <ActionIcon
                                size="lg"
                                variant="light"
                                color="black"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  navigate({
                                    to: "/admin/problems",
                                    search: {
                                      id: problem.id,
                                    },
                                  });
                                }}
                              >
                                <IconEye />
                              </ActionIcon>
                            </Group>
                            <Checkbox
                              aria-label="Select problem"
                              checked={selectedProblems.includes(problem.id)}
                              onChange={(event) =>
                                setSelectedProblems(
                                  event.currentTarget.checked
                                    ? [...selectedProblems, problem.id]
                                    : selectedProblems.filter(
                                      (id) => id !== problem.id,
                                    ),
                                )
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            />
                          </Group>
                        </Box>
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
      </Stack>
    </Paper>
  );
}

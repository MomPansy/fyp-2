import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconClock, IconPlus } from "@tabler/icons-react";
import { ProblemBankListProps } from "./types.ts";
import { useUser } from "@/hooks/auth.ts";
import { dayjs } from "@/lib/dayjs.ts";
import { useUserProblemsInfinite } from "@/components/my-problems/hooks.ts";

export function ProblemBankList({
  filters,
  sorting,
  ...props
}: ProblemBankListProps) {
  const { user_id } = useUser();

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
                <Table.Th>Problem</Table.Th>
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
                    <Table.Tr key={problem.id} style={{ cursor: "pointer" }}>
                      <Table.Td>
                        <Box>
                          <Group justify="space-between" align="center">
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

                            <IconPlus />
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

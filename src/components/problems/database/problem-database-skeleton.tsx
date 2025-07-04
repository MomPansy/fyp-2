import {
    Paper,
    Stack,
    Title,
    Skeleton,
    Group,
    Fieldset,
    SimpleGrid,
    Grid,
    Flex,
    Text,
    Code,
    Box,
} from "@mantine/core";

export function ProblemDatabaseSkeleton() {
    return (
        <Paper p={20} withBorder>
            <Stack>
                {/* Database Setup Title */}
                <Skeleton height={32} width={200} />

                {/* Table Manager Section */}
                <Stack gap="md">
                    <Skeleton height={24} width={150} />
                    <Paper p={16} withBorder>
                        <Stack gap="sm">
                            <Skeleton height={20} width={120} />
                            <Group gap="xs">
                                <Skeleton height={36} width={100} />
                                <Skeleton height={36} width={80} />
                            </Group>
                        </Stack>
                    </Paper>
                </Stack>

                {/* Foreign Keys Title */}
                <Skeleton height={28} width={140} />

                {/* Tables Selection */}
                <Stack gap="xs">
                    <Fieldset legend="Tables">
                        <Group gap="xs">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} height={36} width={80} radius="sm" />
                            ))}
                        </Group>
                    </Fieldset>
                </Stack>

                {/* Reference Table Selection */}
                <Stack gap="xs">
                    <Fieldset legend="Select a table to reference to">
                        <Group gap="xs">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} height={36} width={80} radius="sm" />
                            ))}
                        </Group>
                    </Fieldset>
                </Stack>

                {/* Column Mapping Section */}
                <Fieldset legend={
                    <Text size="sm">
                        Select columns from <Code>Table 1</Code> to reference to <Code>Table 2</Code>
                    </Text>
                }>
                    <Paper px={20} py={20}>
                        <Grid pb={10}>
                            <Grid.Col span={3}>
                                <Skeleton height={20} width={60} />
                            </Grid.Col>
                            <Grid.Col span={3} />
                            <Grid.Col span={3}>
                                <Flex justify="flex-end">
                                    <Skeleton height={20} width={60} />
                                </Flex>
                            </Grid.Col>
                            <Grid.Col span={3} />
                        </Grid>

                        {/* Foreign Key Mapping Rows */}
                        {[1, 2].map((i) => (
                            <SimpleGrid cols={4} pb={20} key={i}>
                                <Skeleton height={36} />
                                <Flex justify="center">
                                    <Box pt={8}>
                                        <Skeleton height={24} width={24} />
                                    </Box>
                                </Flex>
                                <Skeleton height={36} />
                                <Flex justify="center">
                                    <Skeleton height={36} width={36} radius="sm" />
                                </Flex>
                            </SimpleGrid>
                        ))}

                        <Skeleton height={36} width={150} />
                    </Paper>
                </Fieldset>
            </Stack>
        </Paper>
    );
}

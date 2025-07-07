import {
    Button,
    Group,
    Paper,
    Stack,
    Title,
    Skeleton,
    Fieldset,
    SimpleGrid,
    Flex,
    Text,
    Box,
} from "@mantine/core";

export function ProblemDatabasePending() {
    return (
        <Paper p={20} withBorder>
            <Stack>
                <Title>Database Setup</Title>

                {/* Table Manager Skeleton */}
                <Stack gap="md">
                    <Skeleton height={40} width="30%" />
                    <Skeleton height={120} />
                </Stack>

                <Title order={3}>Foreign keys</Title>

                {/* First Table Selector Skeleton */}
                <Stack gap="xs">
                    <Fieldset legend="Tables">
                        <SimpleGrid cols={3} spacing="sm">
                            <Skeleton height={36} />
                            <Skeleton height={36} />
                            <Skeleton height={36} />
                        </SimpleGrid>
                    </Fieldset>
                </Stack>

                {/* Second Table Selector Skeleton */}
                <Stack gap="xs">
                    <Fieldset legend="Select a table to reference to">
                        <SimpleGrid cols={3} spacing="sm">
                            <Skeleton height={36} />
                            <Skeleton height={36} />
                            <Skeleton height={36} />
                        </SimpleGrid>
                    </Fieldset>
                </Stack>

                {/* Foreign Key Selector Skeleton */}
                <Fieldset legend={<Text size="sm">Select columns from Table to reference to Table</Text>}>
                    <Paper px={20} py={20}>
                        <Stack gap="md">
                            {/* Header row */}
                            <SimpleGrid cols={6} spacing="md">
                                <Text size="sm">Table 1</Text>
                                <Box />
                                <Text size="sm">Table 2</Text>
                                <Box />
                                <Box />
                                <Box />
                            </SimpleGrid>

                            {/* Foreign key mapping rows skeleton */}
                            {[1, 2].map((index) => (
                                <SimpleGrid cols={6} spacing="md" key={index}>
                                    <Skeleton height={36} />
                                    <Skeleton height={24} width="60%" />
                                    <Flex justify="center">
                                        <Skeleton height={24} width={24} radius="sm" />
                                    </Flex>
                                    <Skeleton height={36} />
                                    <Skeleton height={24} width="60%" />
                                    <Flex justify="center">
                                        <Skeleton height={36} width={36} radius="sm" />
                                    </Flex>
                                </SimpleGrid>
                            ))}

                            <Skeleton height={36} width="40%" />

                            {/* Debug section skeleton */}
                            <Paper mt="md" p="sm" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                                <Skeleton height={16} width="60%" mb="xs" />
                                <Skeleton height={12} width="80%" mb="xs" />
                                <Skeleton height={12} width="70%" />
                            </Paper>
                        </Stack>
                    </Paper>
                </Fieldset>
            </Stack>

            {/* Action buttons skeleton */}
            <Group justify="flex-end" mt="md">
                <Skeleton height={36} width={120} />
                <Skeleton height={36} width={100} />
            </Group>
        </Paper>
    );
}

import {
    Alert,
    Button,
    Group,
    Paper,
    Stack,
    Title,
    Text,
} from "@mantine/core";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";

interface ProblemDatabaseErrorProps {
    error: Error;
    onRetry?: () => void;
}

export function ProblemDatabaseError({ error, onRetry }: ProblemDatabaseErrorProps) {
    return (
        <Paper p={20} withBorder>
            <Stack>
                <Title>Database Setup</Title>

                <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Error Loading Database"
                    color="red"
                    variant="light"
                >
                    <Text size="sm" mb="md">
                        {error.message || "Failed to load database configuration. Please try again."}
                    </Text>

                    {onRetry && (
                        <Group>
                            <Button
                                variant="outline"
                                size="sm"
                                leftSection={<IconRefresh size={14} />}
                                onClick={onRetry}
                            >
                                Retry
                            </Button>
                        </Group>
                    )}
                </Alert>

                <Stack gap="md" opacity={0.3}>
                    <Title order={3}>Foreign keys</Title>
                    <Text c="dimmed" size="sm">
                        Configure table relationships once the data loads successfully.
                    </Text>
                </Stack>
            </Stack>
        </Paper>
    );
}

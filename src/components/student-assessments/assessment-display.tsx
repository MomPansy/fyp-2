import { Alert, Paper, Stack, Text, Title, Badge, Card } from "@mantine/core";
import { IconClock, IconClockOff, IconCheckbox } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  type NotStartedResponse,
  type EndedResponse,
  type ActiveResponse,
} from "./hooks.ts";

dayjs.extend(relativeTime);

interface AssessmentNotStartedProps {
  data: NotStartedResponse;
}

export function AssessmentNotStarted({ data }: AssessmentNotStartedProps) {
  const scheduledDate = dayjs(data.scheduledDate);
  const timeUntilStart = scheduledDate.fromNow();

  return (
    <Stack gap="lg" align="center" justify="center" mih={400}>
      <Paper p="xl" radius="md" withBorder w="100%" maw={600}>
        <Stack gap="md" align="center">
          <IconClock
            size={64}
            stroke={1.5}
            color="var(--mantine-color-blue-6)"
          />
          <Title order={2} ta="center">
            Assessment Not Started
          </Title>
          <Text size="lg" ta="center" c="dimmed">
            {data.assessmentName}
          </Text>
          <Alert color="blue" radius="md" w="100%">
            <Stack gap="xs">
              <Text fw={500}>Scheduled Time</Text>
              <Text size="sm">
                {scheduledDate.format("MMMM D, YYYY [at] h:mm A")}
              </Text>
              <Text size="sm" c="dimmed">
                Starts {timeUntilStart}
              </Text>
            </Stack>
          </Alert>
          <Text size="sm" ta="center" c="dimmed">
            Please return at the scheduled time to begin your assessment.
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}

interface AssessmentEndedProps {
  data: EndedResponse;
}

export function AssessmentEnded({ data }: AssessmentEndedProps) {
  const scheduledDate = dayjs(data.scheduledDate);
  const endDate = dayjs(data.endDate);
  const timeAgo = endDate.fromNow();

  return (
    <Stack gap="lg" align="center" justify="center" mih={400}>
      <Paper p="xl" radius="md" withBorder w="100%" maw={600}>
        <Stack gap="md" align="center">
          <IconClockOff
            size={64}
            stroke={1.5}
            color="var(--mantine-color-red-6)"
          />
          <Title order={2} ta="center">
            Assessment Ended
          </Title>
          <Text size="lg" ta="center" c="dimmed">
            {data.assessmentName}
          </Text>
          <Alert color="red" radius="md" w="100%">
            <Stack gap="xs">
              <Text fw={500}>Assessment Period</Text>
              <Text size="sm">
                Started: {scheduledDate.format("MMMM D, YYYY [at] h:mm A")}
              </Text>
              <Text size="sm">
                Ended: {endDate.format("MMMM D, YYYY [at] h:mm A")}
              </Text>
              <Text size="sm" c="dimmed">
                Ended {timeAgo}
              </Text>
            </Stack>
          </Alert>
          <Text size="sm" ta="center" c="dimmed">
            This assessment is no longer available for completion.
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}

interface AssessmentActiveProps {
  data: ActiveResponse;
}

export function AssessmentActive({ data }: AssessmentActiveProps) {
  const { assessment } = data;
  const durationMinutes = Number(assessment.duration);
  const endDate = assessment.endDate ? dayjs(assessment.endDate) : null;

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Stack gap="md">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title order={2}>{assessment.name}</Title>
            <Badge
              color="green"
              size="lg"
              leftSection={<IconCheckbox size={16} />}
            >
              Active
            </Badge>
          </div>

          {endDate && (
            <Alert color="yellow" radius="md">
              <Stack gap="xs">
                <Text fw={500}>Time Remaining</Text>
                <Text size="sm">
                  This assessment will end at {endDate.format("h:mm A")}
                </Text>
                <Text size="sm" c="dimmed">
                  Duration: {durationMinutes} minutes
                </Text>
              </Stack>
            </Alert>
          )}

          {!endDate && (
            <Text size="sm" c="dimmed">
              Duration: {durationMinutes} minutes
            </Text>
          )}
        </Stack>
      </Paper>

      <Stack gap="md">
        <Title order={3}>Problems</Title>
        {assessment.problems.length === 0 ? (
          <Alert color="blue">
            No problems have been added to this assessment yet.
          </Alert>
        ) : (
          assessment.problems.map((problem, index) => (
            <Card key={problem.id} padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <Badge color="blue" variant="light">
                    Problem {index + 1}
                  </Badge>
                  <Title order={4}>{problem.name}</Title>
                </div>
                <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                  {problem.description}
                </Text>
              </Stack>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  );
}

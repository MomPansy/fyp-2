import {
  Accordion,
  Badge,
  Code,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import {
  useFetchAssessmentSubmissions,
  type Submission,
  type SubmissionDetail,
} from "./submissions-hooks.ts";

function getGradeBadgeColor(grade: string): string {
  switch (grade.toLowerCase()) {
    case "pass":
      return "green";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

function SubmissionDetailItem({ detail }: { detail: SubmissionDetail }) {
  return (
    <Paper withBorder p="md" radius="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>{detail.problem.name}</Text>
          <Group gap="xs">
            <Badge variant="light" color="blue" size="sm">
              {detail.dialect}
            </Badge>
            <Badge
              variant="filled"
              color={getGradeBadgeColor(detail.grade)}
              size="sm"
            >
              {detail.grade.toUpperCase()}
            </Badge>
          </Group>
        </Group>
        <Text size="sm" c="dimmed">
          {detail.problem.description}
        </Text>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Submitted Answer:
          </Text>
          <Code block style={{ whiteSpace: "pre-wrap" }}>
            {detail.candidateAnswer}
          </Code>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SubmissionAccordionItem({ submission }: { submission: Submission }) {
  const passedCount = submission.details.filter(
    (d) => d.grade.toLowerCase() === "pass",
  ).length;
  const totalCount = submission.details.length;
  const displayName =
    submission.user.fullName ??
    submission.user.matriculationNumber ??
    submission.user.email;

  return (
    <Accordion.Item value={submission.id}>
      <Accordion.Control>
        <Group justify="space-between" wrap="nowrap" pr="md">
          <Group gap="sm">
            <IconUser size={18} />
            <div>
              <Text fw={500}>{displayName}</Text>
              <Text size="xs" c="dimmed">
                {submission.user.email}
              </Text>
            </div>
          </Group>
          <Group gap="md">
            <Badge
              variant="light"
              color={passedCount === totalCount ? "green" : "orange"}
            >
              {passedCount}/{totalCount} Passed
            </Badge>
            <Text size="sm" c="dimmed">
              {dayjs(submission.createdAt).format("DD MMM YYYY, HH:mm")}
            </Text>
          </Group>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          {submission.details.map((detail) => (
            <SubmissionDetailItem key={detail.id} detail={detail} />
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function SubmissionsTab() {
  const { id: assessmentId } = useParams({
    from: "/_admin/admin/assessment/$id/details",
  });
  const { data } = useFetchAssessmentSubmissions(assessmentId);

  if (data.submissions.length === 0) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Stack align="center" gap="md">
          <Title order={4} c="dimmed">
            No Submissions Yet
          </Title>
          <Text c="dimmed" size="sm">
            Candidate submissions will appear here once the assessment has been
            taken.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Submissions ({data.submissions.length})</Title>
      </Group>
      <Accordion variant="separated" radius="md">
        {data.submissions.map((submission) => (
          <SubmissionAccordionItem
            key={submission.id}
            submission={submission}
          />
        ))}
      </Accordion>
    </Stack>
  );
}

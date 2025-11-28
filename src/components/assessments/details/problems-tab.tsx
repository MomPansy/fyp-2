import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconCalendar,
  IconClock,
  IconTimeDuration60,
  IconTrophy,
} from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import dayjs from "dayjs";
import { AssessmentProblem, useFetchAssessmentById } from "../hooks.ts";
import { getAssessmentStatus } from "../utils.ts";
import { ProblemBankModal } from "./problem-bank/index.ts";
import { ProblemPreviewModal } from "@/components/problems/problem-preview-modal.tsx";

export function ProblemsTab() {
  const { id } = useParams({ from: "/_admin/admin/assessment/$id/details" });
  const [opened, { open, close }] = useDisclosure(false);

  const { data } = useFetchAssessmentById(id);
  const existingProblemIds = data?.assessment_problems.map(
    (ap) => ap.user_problems.id,
  );

  // Format the scheduled date
  const formattedDate = data?.date_time_scheduled
    ? dayjs(data.date_time_scheduled).format("DD MMM YYYY")
    : undefined;

  const formattedTime = data?.date_time_scheduled
    ? dayjs(data.date_time_scheduled).format("hh:mm A")
    : "Not scheduled";

  const status = data
    ? getAssessmentStatus(data)
    : { label: "Draft", color: "gray" };
  const isCancelled = !!data?.archived_at;

  return (
    <>
      <Group>
        <Paper withBorder p="md" radius="md" w="67%" m="auto">
          <Stack>
            <Stack>
              <Group>
                <Text fw="bold">{data?.name}</Text>
                <Badge variant="light" color={status.color}>
                  {status.label}
                </Badge>
              </Group>
              <Group justify="flex-start" gap="8rem">
                <Group gap={"3px"} align="center">
                  <IconCalendar size={16} stroke="2.5px" color="blue" />
                  <Text size="sm">Date: &nbsp;{formattedDate}</Text>
                </Group>
                {formattedTime && (
                  <Group gap={"3px"} align="center">
                    <IconClock size={16} stroke="2.5px" color="blue" />
                    <Text size="sm">Time: &nbsp;{formattedTime}</Text>
                  </Group>
                )}
                <Group gap={"3px"} align="center">
                  <IconTimeDuration60 size={16} stroke="2.5px" color="blue" />
                  <Text size="sm">
                    Duration: &nbsp;{data?.duration ?? 60} minutes
                  </Text>
                </Group>
                <Group gap={"3px"} align="center">
                  <IconTrophy size={16} stroke="2.5px" color="blue" />
                  <Text size="sm">
                    Problems: &nbsp;{data?.assessment_problems.length ?? 0}
                  </Text>
                </Group>
              </Group>
            </Stack>
            <Divider my="md" w="full" />
            <Stack h="400px">
              <Group justify="space-between">
                <Text fw="bold">
                  Problems ({data?.assessment_problems.length ?? 0})
                </Text>
                <Button onClick={open} disabled={isCancelled}>
                  Manage
                </Button>
              </Group>
              {isCancelled && (
                <Text size="sm" c="dimmed">
                  This assessment is cancelled. Restore it to manage problems.
                </Text>
              )}
              <ProblemsList problems={data?.assessment_problems} />
            </Stack>
          </Stack>
        </Paper>
      </Group>
      {opened && (
        <ProblemBankModal
          close={close}
          existingProblemIds={existingProblemIds}
        />
      )}
    </>
  );
}

function ProblemsList({
  problems,
}: {
  problems: AssessmentProblem[] | undefined;
}) {
  const [selectedProblem, setSelectedProblem] =
    useState<AssessmentProblem | null>(null);

  if (!problems || problems.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No problems added yet.
      </Text>
    );
  }

  return (
    <>
      <Stack gap="xs">
        {problems.map((item) => (
          <Button
            onClick={() => setSelectedProblem(item)}
            variant="default"
            size="xl"
            justify="flex-start"
            key={item.user_problems.id}
          >
            <Text>{item.user_problems.name}</Text>
          </Button>
        ))}
      </Stack>

      <ProblemPreviewModal
        problem={
          selectedProblem
            ? {
              name: selectedProblem.user_problems.name,
              description: selectedProblem.user_problems.description,
              answer: selectedProblem.user_problems.answer,
            }
            : null
        }
        onClose={() => setSelectedProblem(null)}
        showAnswer
      />
    </>
  );
}

import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useDisclosure } from "@mantine/hooks";
import { useFetchAssessmentById } from "../hooks.ts";
import { ProblemBankModal } from "./problem-bank/index.ts";

export function ProblemsTab() {
  const { id } = useParams({ from: "/_admin/admin/assessment/$id/details" });
  const [opened, { open, close }] = useDisclosure(false);

  const { data } = useFetchAssessmentById(id);

  return (
    <>
      <Group>
        <Paper withBorder p="md" radius="md" w="67%" m="auto">
          <Stack>
            <Group pt="md">
              <Text fw="bold">Assessment duration:</Text>
              <Text>{data?.duration ?? 60} minutes</Text>
              <ActionIcon variant="subtle" size="sm">
                <IconEdit />
              </ActionIcon>
            </Group>
            <Divider my="md" w="full" />
            <Stack h="400px">
              <Group justify="space-between">
                <Text fw="bold">
                  Problems ({data?.assessment_problems.length ?? 0})
                </Text>
                <Button onClick={open}>Add Problem</Button>
              </Group>
            </Stack>
          </Stack>
        </Paper>
      </Group>
      {opened && <ProblemBankModal close={close} />}
    </>
  );
}

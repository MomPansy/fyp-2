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
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  IconCalendar,
  IconClock,
  IconGripVertical,
  IconTrophy,
} from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useDisclosure, useListState } from "@mantine/hooks";
import { useEffect } from "react";
import { CSS } from "@dnd-kit/utilities";
import dayjs from "dayjs";
import { AssessmentProblem, useFetchAssessmentById } from "../hooks.ts";
import { ProblemBankModal } from "./problem-bank/index.ts";

export function ProblemsTab() {
  const { id } = useParams({ from: "/_admin/admin/assessment/$id/details" });
  const [opened, { open, close }] = useDisclosure(false);

  const { data } = useFetchAssessmentById(id);
  const existingProblemIds = data?.assessment_problems.map(
    (ap) => ap.user_problems.id,
  );

  // Format the scheduled date
  const formattedDate = data?.date_time_scheduled
    ? dayjs(data.date_time_scheduled).format("MMM DD, YYYY - hh:mm A")
    : "Not scheduled";

  // Determine assessment status
  const getAssessmentStatus = () => {
    if (!data?.date_time_scheduled) {
      return { label: "Draft", color: "gray" };
    }
    const now = new Date();
    const scheduledDate = new Date(data.date_time_scheduled);
    if (scheduledDate > now) {
      return { label: "Scheduled", color: "blue" };
    }
    return { label: "Active", color: "green" };
  };

  const status = getAssessmentStatus();

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
                <Group gap={"3px"} align="center">
                  <IconClock size={16} stroke="2.5px" color="blue" />
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
                <Button onClick={open}>Manage</Button>
              </Group>
              <DNDListHandle problems={data?.assessment_problems} />
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

function DNDListHandle({
  problems,
}: {
  problems: AssessmentProblem[] | undefined;
}) {
  const [state, handlers] = useListState<AssessmentProblem>([]);

  // Sync with props only when problems change
  useEffect(() => {
    if (problems) {
      handlers.setState(problems);
    }
  }, [problems, handlers]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      // No movement needed if dropped in same position or outside valid drop zone
      return;
    }
    const oldIndex = state.findIndex((i) => i.user_problems.id === active.id);
    const newIndex = state.findIndex((i) => i.user_problems.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      handlers.setState(arrayMove(state, oldIndex, newIndex));
    }
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={state.map((i) => i.user_problems.id)}
        strategy={verticalListSortingStrategy}
      >
        {state.map((item) => (
          <SortableItem {...item} key={item.user_problems.id} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableItem(item: AssessmentProblem) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.user_problems.id,
  });

  return (
    <Paper
      p="md"
      radius="sm"
      withBorder
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      shadow={isDragging ? "md" : undefined}
      {...attributes}
    >
      <Group>
        <div {...listeners}>
          <IconGripVertical stroke={1.5} />
        </div>
        <Group flex={1} justify="flex-start">
          <Text>{item.user_problems.name}</Text>
        </Group>
      </Group>
    </Paper>
  );
}

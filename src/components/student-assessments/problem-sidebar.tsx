import { Stack, Text, ActionIcon } from "@mantine/core";
import { IconLogout2 } from "@tabler/icons-react";
import { CustomAnchor } from "@/components/buttons/link-button.tsx";

interface ProblemSidebarProps {
  problems: { id: string; name: string }[];
  selectedProblemIndex: number;
  onSelectProblem: (index: number) => void;
}

export function ProblemSidebar({
  problems,
  selectedProblemIndex,
  onSelectProblem,
}: ProblemSidebarProps) {
  return (
    <Stack h="full" p="sm" align="center" className="border-r border-gray-200">
      <Stack flex={1} align="center">
        <Text size="xs" fw={600} c="dimmed">
          Problems
        </Text>
        <Stack gap="xs">
          {problems.map((problem, index) => (
            <ActionIcon
              key={problem.id}
              variant={selectedProblemIndex === index ? "filled" : "outline"}
              onClick={() => onSelectProblem(index)}
              radius="xl"
              size="lg"
              color={selectedProblemIndex === index ? "green" : "gray"}
            >
              {index + 1}
            </ActionIcon>
          ))}
        </Stack>
      </Stack>
      <Stack>
        <CustomAnchor to={"/student/dashboard"}>
          <ActionIcon size="lg" color="red" variant="outline">
            <IconLogout2 />
          </ActionIcon>
        </CustomAnchor>
      </Stack>
    </Stack>
  );
}

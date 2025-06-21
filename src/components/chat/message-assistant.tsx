import {
  Accordion,
  Avatar,
  Card,
  Group,
  Stack,
  useMantineTheme,
} from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';

export function MessageAssistant() {
  const theme = useMantineTheme();

  return (
    <Group pos="relative" align="flex-start" wrap="nowrap">
      <Avatar
        color={theme.colors[theme.primaryColor][4]}
        className="sticky top-[60px]"
      >
        <IconRobot stroke={1.75} />
      </Avatar>
      <Stack w="100%" gap="xs">
        <Card
          withBorder
          radius="lg"
          className="w-full flex-1 bg-default-hover p-xs"
        >
          Assistant message
        </Card>
      </Stack>
    </Group>
  );
}

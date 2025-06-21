import { Avatar, Card, Group } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';

export function MessageUser() {
  return (
    <Group pos="relative" align="flex-start">
      <Avatar color="green" className="sticky top-[60px]">
        <IconUser stroke={1.75} />
      </Avatar>
      <Card
        withBorder
        radius="lg"
        className="w-full flex-1 whitespace-pre-wrap p-xs"
      >
        User Message
      </Card>
    </Group>
  );
}

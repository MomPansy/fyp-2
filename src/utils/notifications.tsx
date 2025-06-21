import { rem } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

export function showSuccess(message: string) {
  notifications.show({
    icon: (
      <IconCheck style={{ width: rem(20), height: rem(20) }} stroke={1.75} />
    ),
    message,
    color: 'teal',
  });
}

export function showError(message: string) {
  notifications.show({
    icon: <IconX style={{ width: rem(20), height: rem(20) }} stroke={1.75} />,
    message,
    color: 'red',
  });
}

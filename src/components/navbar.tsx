import {
  Avatar,
  Button,
  Divider,
  Group,
  NavLink,
  NavLinkProps,
  Stack,
} from '@mantine/core';
import {
  IconFilePencil,
  IconHome,
  IconLogout,
} from '@tabler/icons-react';
import { useNavigate, LinkProps, Link } from '@tanstack/react-router';
import { ColorScheme } from 'components/color-scheme.tsx';
import {
  showErrorNotification,
  showSuccessNotification,
} from 'components/notifications.ts';
import { supabase } from 'lib/supabase.ts';
import { useAccessToken, useUser } from 'hooks/auth.ts';

interface NavbarLinkProps {
  leftSection: NavLinkProps['leftSection'];
  label: NavLinkProps['label'];
  onClick?: () => void;
  to: LinkProps['to'];
}

function NavbarLink({
  leftSection,
  label,
  onClick,
  ...props
}: NavbarLinkProps) {
  return (
    <NavLink
      {...props}
      component={Link}
      leftSection={leftSection}
      label={label}
      onClick={onClick}
      classNames={{
        root: 'flex items-center rounded-[6px] py-1 font-medium',
        label: 'flex items-center h-7 truncate',
      }}
    />
  );
}


export function Navbar({ close }: { close?: () => void }) {
  const navigate = useNavigate();
  const { data } = useAccessToken();

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showErrorNotification({
        message: error.message,
      });
    } else {
      showSuccessNotification({
        message: 'Successfully logged out!',
      });
    }
    navigate({ to: '/login' });
  };

  return (
    <div className="flex h-full max-h-screen flex-col gap-4 p-3">
      <div className="flex items-center gap-2">
        <ColorScheme />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4">
        <section className="flex flex-col gap-2">
          <NavbarLink
            to='/admin/dashboard'
            leftSection={<IconHome className="size-5" />}
            label="Dashboard"
            onClick={close}
          />
          <NavbarLink
            to='/admin/assessments/create'
            leftSection={<IconFilePencil className="size-5" />}
            label="Create Assessment"
            onClick={close}
          />
          <Divider my={4} />
        </section>
        <Stack>
          <Group>
            <Avatar color='initials' name={data.payload.email} />
            <div className="text-center text-sm text-gray-500">
              {data.payload.email}
            </div>
          </Group>
          <Button
            className="justify-self-end"
            leftSection={<IconLogout className="size-5" />}
            size="sm"
            variant="outline"
            color="gray"
            onClick={logout}
          >
            Log out
          </Button>
        </Stack>
      </div>
    </div>
  );
}

import {
  Accordion,
  NavLink,
  Avatar,
  Button,
  NavLinkProps,
  Group,
  Stack,
} from '@mantine/core';
import {
  IconFilePencil,
  IconHome,
  IconLogout,
} from '@tabler/icons-react';
import { useNavigate, LinkComponent, createLink } from '@tanstack/react-router';
import { ColorScheme } from 'components/color-scheme.tsx';
import {
  showErrorNotification,
  showSuccessNotification,
} from 'components/notifications.ts';
import { supabase } from 'lib/supabase.ts';
import { useAccessToken } from 'hooks/auth.ts';
import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useCallback } from 'react';

// Browser-compatible UUID generation
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
interface MantineNavLinkProps extends Omit<NavLinkProps, 'href'> {

}

const MantineLinkComponent = forwardRef<
  HTMLAnchorElement, MantineNavLinkProps
>((props, ref) => {
  return <NavLink ref={ref} {...props} />
})

const CreatedLinkComponent = createLink(MantineLinkComponent)

export const CustomLink: LinkComponent<typeof MantineLinkComponent> = (
  props,
) => {
  return <CreatedLinkComponent preload="intent" {...props} />
}


export function Navbar({ close }: { close?: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate();
  const { data } = useAccessToken();

  // Memoize UUID generation to avoid creating new links on each render
  const createProblemId = useCallback(() => generateUUID(), []);

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
      queryClient.invalidateQueries({
        queryKey: ['accessToken'],
      })
    }
    console.log('Logging out');
    navigate({ to: '/login' });
  };

  return (
    <div className="flex h-full max-h-screen flex-col gap-4 p-3">
      <div className="flex items-center gap-2">
        <ColorScheme />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4">
        <section className="flex flex-col gap-2">
          <CustomLink to='/admin/dashboard' leftSection={<IconHome className='size-5' />} label="Dashboard" />
          <Accordion>
            <Accordion.Item value="problems">
              <Accordion.Control>
                <Group>
                  <IconFilePencil className="size-5" />
                  <span>Problems</span>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <CustomLink
                  to='/admin/problems'
                  leftSection={<IconFilePencil className="size-5" />}
                  label="My Problems"
                  onClick={close}
                />
                <CustomLink
                  to='/admin/problem/$id/details'
                  params={{ id: createProblemId() }}
                  leftSection={<IconFilePencil className="size-5" />}
                  label="Create Problem"
                  onClick={close}
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
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

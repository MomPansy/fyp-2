
import { useEffect } from 'react';
import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { type QueryClient } from '@tanstack/react-query';

import { createRootRouteWithContext, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: Component,
  notFoundComponent: NotFoundComponent,
});

function Component() {
  return (
    <>
      <hr />
      <Outlet />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-right" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  )
}

export default function NotFoundComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: '/' });
  }, [navigate]);

  return (
    <>
      <Center>
        <Stack h="100vh" align="stretch" justify="center" gap="md">
          <Center>
            <Title c="hf-blue" textWrap="balance">
              Page Not Found
            </Title>
          </Center>
          <Text c="hf-blue">
            Oops! The page you are looking for does not exist.
          </Text>
          <Button
            w="50%"
            color="hf-orange"
            onClick={() => (window.location.href = '/')}
            style={{ marginLeft: 'auto', marginRight: 'auto' }}
          >
            Home
          </Button>
        </Stack>
      </Center>
    </>
  );
}

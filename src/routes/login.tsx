import { createFileRoute, redirect } from '@tanstack/react-router';
import { accessTokenQueryOptions } from 'hooks/auth.ts';
import { memo } from 'react';
import { Login } from 'components/auth/login.tsx';

export const Route = createFileRoute('/login')({
  async beforeLoad({ context: { queryClient } }) {
    // Ensure the user is authenticated before loading the login page
    try {
      await queryClient.ensureQueryData(accessTokenQueryOptions);
      throw redirect({ to: '/' });

    } catch (_error) {

    }
  },
  component: memo(Login),
});


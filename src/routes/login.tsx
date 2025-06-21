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

    } catch (error) {
      if (error instanceof Error) {
        console.log("Auth error:", error.message);
      } else {
        // This could be a redirect, just rethrow it
        throw error;
      }
    }
  },
  component: memo(Login),
});


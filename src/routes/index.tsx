import { createFileRoute, redirect } from '@tanstack/react-router'
import { accessTokenQueryOptions } from 'hooks/auth.ts'

export const Route = createFileRoute('/')({
  async beforeLoad({ context: { queryClient } }) {
    try {
      await queryClient.ensureQueryData(accessTokenQueryOptions);
    } catch (_error) {
      throw redirect({ to: '/login' });
    }
    throw redirect({ to: '/chat' });
  },
});

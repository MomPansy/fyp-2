import { createFileRoute, redirect } from '@tanstack/react-router'
import { accessTokenQueryOptions } from 'hooks/auth.ts'
import { JwtPayload } from 'server/zod/jwt';

export const Route = createFileRoute('/')({
  async beforeLoad({ context: { queryClient } }) {
    let payload: JwtPayload;
    try {
      const { payload: jwtPayload } = await queryClient.ensureQueryData(accessTokenQueryOptions);
      payload = jwtPayload;
    } catch (_error) {
      throw redirect({ to: '/login' });
    }

    if (!payload) {
      throw redirect({ to: '/login' });
    }
    if (payload.role === 'admin') {
      throw redirect({ to: '/admin/dashboard' })
    } else {
      throw redirect({ to: '/student/dashboard' })
    }
  },
});

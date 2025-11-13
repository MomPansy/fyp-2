import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessTokenQueryOptions } from "hooks/auth.ts";

export const Route = createFileRoute("/")({
  async beforeLoad({ context: { queryClient } }) {
    try {
      const { payload } = await queryClient.ensureQueryData(
        accessTokenQueryOptions,
      );

      // Redirect to appropriate dashboard based on role
      if (payload.user_metadata.role === "admin") {
        redirect({ to: "/admin/dashboard", throw: true });
      } else {
        redirect({ to: "/student/dashboard", throw: true });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      redirect({ to: "/login", throw: true });
    }
  },
});

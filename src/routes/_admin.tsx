import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessTokenQueryOptions } from "@/hooks/auth.ts";
import { Sidebar } from "components/sidebar.tsx";
export const Route = createFileRoute("/_admin")({
  async beforeLoad({ context: { queryClient } }) {
    try {
      const { payload } = await queryClient.ensureQueryData(
        accessTokenQueryOptions,
      );

      // Only allow admins to access this route
      if (payload.user_metadata.role !== "admin") {
        redirect({ to: "/student/dashboard", throw: true });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      redirect({ to: "/login", throw: true });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Sidebar />;
}

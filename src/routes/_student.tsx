import { createFileRoute, redirect } from "@tanstack/react-router";
import { Sidebar } from "components/sidebar.tsx";
import { accessTokenQueryOptions } from "@/hooks/auth.ts";

export const Route = createFileRoute("/_student")({
  async beforeLoad({ context: { queryClient } }) {
    try {
      const { payload } = await queryClient.ensureQueryData(
        accessTokenQueryOptions,
      );

      // Only allow students to access this route
      if (payload.user_metadata.role !== "student") {
        redirect({ to: "/login", throw: true });
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

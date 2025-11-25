/* eslint-disable @typescript-eslint/only-throw-error */
import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
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
        throw redirect({ to: "/login" });
      }
    } catch (error) {
      // If it's a redirect, re-throw it so it's not caught here
      if (isRedirect(error)) {
        throw error;
      }

      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Sidebar />;
}

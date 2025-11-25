/* eslint-disable @typescript-eslint/only-throw-error */
import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
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
        throw redirect({ to: "/student/dashboard" });
      }
    } catch (error) {
      // If it's a redirect, re-throw it so it's not caught here
      if (isRedirect(error)) {
        throw error;
      }

      console.info("User not authenticated, redirecting to login");
      console.error(error);
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Sidebar />;
}

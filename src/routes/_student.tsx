/* eslint-disable @typescript-eslint/only-throw-error */
import { Suspense } from "react";
import {
  createFileRoute,
  redirect,
  isRedirect,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
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
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  // Hide sidebar for assessment routes (full screen experience)
  const hideNavbar = pathname.includes("/student/assessment/");

  if (hideNavbar) {
    return (
      <div style={{ height: "100vh", overflow: "hidden" }}>
        <Suspense>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  return <Sidebar variant="student" />;
}

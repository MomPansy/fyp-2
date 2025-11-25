/* eslint-disable @typescript-eslint/only-throw-error */
import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { accessTokenQueryOptions } from "hooks/auth.ts";

export const Route = createFileRoute("/")({
  async beforeLoad({ context: { queryClient } }) {
    try {
      const { payload } = await queryClient.ensureQueryData(
        accessTokenQueryOptions,
      );

      // Redirect to appropriate dashboard based on role
      if (payload.user_metadata.role === "admin") {
        throw redirect({ to: "/admin/dashboard" });
      } else {
        throw redirect({ to: "/student/dashboard" });
      }
    } catch (error) {
      // If it's a redirect, re-throw it so it's not caught here
      if (isRedirect(error)) {
        throw error;
      }

      // Authentication error - redirect to login
      console.error("Authentication error, redirecting to login:", error);
      throw redirect({ to: "/login" });
    }
  },
});

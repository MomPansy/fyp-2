/* eslint-disable @typescript-eslint/only-throw-error */
import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { memo } from "react";
import { accessTokenQueryOptions } from "hooks/auth.ts";
import { Login } from "components/auth/login.tsx";

export const Route = createFileRoute("/login")({
  async beforeLoad({ context: { queryClient } }) {
    // Ensure the user is authenticated before loading the login page
    try {
      await queryClient.ensureQueryData(accessTokenQueryOptions);
      throw redirect({ to: "/" });
    } catch (error) {
      // If it's a redirect, re-throw it so it's not caught here
      if (isRedirect(error)) {
        throw error;
      }
      // User not authenticated, allow them to see the login page
    }
  },
  component: memo(Login),
});

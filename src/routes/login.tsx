/* eslint-disable @typescript-eslint/only-throw-error */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { memo } from "react";
import { accessTokenQueryOptions } from "hooks/auth.ts";
import { Login } from "components/auth/login.tsx";

export const Route = createFileRoute("/login")({
  async beforeLoad({ context: { queryClient } }) {
    // Ensure the user is authenticated before loading the login page
    try {
      await queryClient.ensureQueryData(accessTokenQueryOptions);
      throw redirect({ to: "/" });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // do nothing
    }
  },
  component: memo(Login),
});

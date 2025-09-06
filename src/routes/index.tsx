/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/only-throw-error */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { accessTokenQueryOptions } from "hooks/auth.ts";
import { JwtPayload } from "server/zod/jwt.ts";

export const Route = createFileRoute("/")({
  async beforeLoad({ context: { queryClient } }) {
    let payload: JwtPayload;
    try {
      const { payload: jwtPayload } = await queryClient.ensureQueryData(
        accessTokenQueryOptions,
      );
      payload = jwtPayload;
    } catch (_error) {
      throw redirect({ to: "/login" });
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!payload) {
      throw redirect({ to: "/login" });
    }
    if (payload.user_metadata.role === "admin") {
      throw redirect({ to: "/admin/dashboard" });
    } else {
      throw redirect({ to: "/student/dashboard" });
    }
  },
});

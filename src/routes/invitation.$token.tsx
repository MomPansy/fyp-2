import { createFileRoute } from "@tanstack/react-router";
import { InvitationAccept } from "components/invitation/invitation-accept.tsx";

export const Route = createFileRoute("/invitation/$token")({
  component: InvitationAccept,
});

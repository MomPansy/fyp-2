import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "components/sidebar.tsx";

export const Route = createFileRoute("/_student")({
  component: RouteComponent,
});

function RouteComponent() {
  // some trivial change to force a re run
  return <Sidebar />;
}

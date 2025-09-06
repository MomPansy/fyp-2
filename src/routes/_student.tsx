import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "components/sidebar.tsx";

export const Route = createFileRoute("/_student")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Sidebar />;
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_student/student/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_student/student/dashboard"!</div>;
}

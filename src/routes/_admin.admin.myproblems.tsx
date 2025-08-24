import { useProblemsInfinityQuery } from '@/components/problems-library/hooks';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_admin/admin/myproblems')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_admin/admin/problems"!</div>;
}

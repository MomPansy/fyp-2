import { createFileRoute, Outlet } from '@tanstack/react-router';
import { Sidebar } from 'components/sidebar.tsx';

export const Route = createFileRoute('/_admin')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Sidebar />;
}


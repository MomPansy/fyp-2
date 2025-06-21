import { createFileRoute } from '@tanstack/react-router';
import { Register } from 'components/auth/register';
export const Route = createFileRoute('/register')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Register />
  );
}

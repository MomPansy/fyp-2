import { createFileRoute } from '@tanstack/react-router';
import { ChatMain } from 'components/chat/chat-main';

export const Route = createFileRoute('/chat')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ChatMain />
  );
}

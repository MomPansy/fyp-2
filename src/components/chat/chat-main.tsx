import { Container, Stack } from '@mantine/core';

import { ChatFooter } from './chat-footer.tsx';

import { MessageAssistant } from './message-assistant.tsx';
import { MessageUser } from './message-user.tsx';

export function ChatMain() {

  return (
    <>
      <div className="flex-1 p-md pb-xl">
        <Container>
          <Stack gap="lg">
            <MessageUser />
            <MessageAssistant />
          </Stack>
        </Container>
      </div>
      <ChatFooter />
    </>
  );
}

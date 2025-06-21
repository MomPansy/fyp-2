import {
    Textarea,
    ActionIcon,
    rem,
    Container,
    Stack,
  } from '@mantine/core';
  import { useForm } from '@mantine/form';
  import { IconPlayerStop, IconSend } from '@tabler/icons-react';
  
  import { cn } from 'lib/cn.ts';
  
  export function ChatFooter() {
    const form = useForm({
      initialValues: {
        content: '',
      },
    });

    const onSubmit = form.onSubmit((values) => {
      // Handle form submission logic here;
      form.reset();
    });

    const isPending = false; 
  
    return (
      <div
        className={cn(
          'sticky bottom-0 z-10 bg-transparent bg-gradient-to-b pb-lg',
          'from-white/60 to-white shadow-[0_0_30px_30px_rgba(255,255,255,0.6)]',
          'dark:from-[rgba(26,27,30,0.6)] dark:to-[rgb(26,27,30)] dark:shadow-[0_0_30px_30px_rgba(26,27,30,0.6)]',
        )}
      >
        <Container>
          <form onSubmit={onSubmit}>
            <Stack>
              <Textarea
                classNames={{
                  root: '',
                  section: '',
                  input: '',
                }}
                radius="md"
                size="md"
                placeholder="Type your message..."
                minRows={2}
                maxRows={8}
                autosize
                data-autofocus
                autoFocus
                tabIndex={0}
                rightSectionWidth={rem(60)}
                rightSection={
                  isPending ? (
                    <ActionIcon
                      variant="filled"
                      color="violet"
                      size="lg"
                      onClick={stop}
                    >
                      <IconPlayerStop
                        style={{ width: rem(18), height: rem(18) }}
                        stroke={1.75}
                      />
                    </ActionIcon>
                  ) : (
                    <ActionIcon
                      variant="filled"
                      color="violet"
                      size="lg"
                      disabled={!form.getValues().content}
                      type="submit"
                    >
                      <IconSend
                        style={{ width: rem(18), height: rem(18) }}
                        stroke={1.75}
                      />
                    </ActionIcon>
                  )
                }
                enterKeyHint="send"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                {...form.getInputProps('content')}
              />
            </Stack>
          </form>
        </Container>
      </div>
    );
  }
  
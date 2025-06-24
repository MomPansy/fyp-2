import { Stack, Title, Text, Paper, Button } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { EditorTerminal } from 'components/editor-terminal';
import { Drop } from 'components/dropzone';
import { MarkdownEditor} from 'components/markdown-editor';

export const Route = createFileRoute('/_admin/admin/assessments/create')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Stack py={20} px={120}>
      <Title> Create Assessment Question </Title>
      <Text >Craft your question, provide data and set the expected answer.</Text>
      <Paper shadow='sm'>
        <MarkdownEditor />
      </Paper>
      <Paper shadow='sm' p={20} mt={20} withBorder>
        <Title order={3}> Upload Data </Title>
        <Drop />
      </Paper>
      <Paper shadow='sm' p={20} mt={20} withBorder>
        <EditorTerminal />
      </Paper>
      <Button mt={20} variant="filled" color="green" size="md">
        Save Assessment
      </Button>
    </Stack>
  )
}


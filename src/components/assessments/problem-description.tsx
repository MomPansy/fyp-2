import { Paper, Select, Stack, TextInput, Title } from "@mantine/core";
import { MarkdownEditor } from "components/markdown-editor";


export function ProblemDescription() {
  return (
    <Paper>
      <Stack>
        <Title> Problem Details</Title>
        <TextInput
          placeholder="Enter your question name"
          label="Question name"
          required
        />
        <Select
          label="Problem Description"
          placeholder="Choose a template"
          w={200}
        />
        <Paper shadow="sm">
          <MarkdownEditor />
        </Paper>
      </Stack>
    </Paper>
  )
}
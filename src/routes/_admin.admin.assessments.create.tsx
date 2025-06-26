import {
  Stack,
  Title,
  Paper,
  SimpleGrid,
  TextInput,
  Select,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { AssessmentDatabaseSetup } from "components/assessments/assessment-database.tsx";
import { MarkdownEditor } from "components/markdown-editor.tsx";

export const Route = createFileRoute("/_admin/admin/assessments/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SimpleGrid cols={2} px={20} py={20} spacing="xl">
      <Paper p={20} withBorder>
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
      <AssessmentDatabaseSetup />
    </SimpleGrid>
  );
}

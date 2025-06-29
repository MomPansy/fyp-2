import { Button, Flex, Group, Paper, Select, Stack, TextInput, Title } from "@mantine/core";
import { DEFAULT_PROBLEM_TEMPLATE } from "./problem-template-html";
import RichTextEditor from 'reactjs-tiptap-editor'
import { extensions } from 'lib/react-tiptap-editor';
import { Dispatch, SetStateAction, useState, } from 'react';

const templates = [
  {
    label: "Default Problem Template",
    value: DEFAULT_PROBLEM_TEMPLATE,
  },
  {
    label: "Custom Template",
    value: "",
  }
]

interface ProblemDescriptionProps {
  nextStep: () => void;
  prevStep: () => void;
};

export function ProblemDescription({ nextStep, prevStep }: ProblemDescriptionProps) {
  // use session storage to store the content
  const [content, setContent] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateChange = (value: string | null) => {
    setSelectedTemplate(value);
    setContent(value ?? "");
  };

  return (
    <Paper>
      <Stack>
        <Group justify="space-between">
          <Title> Problem Details</Title>
          <Group>
            <Button onClick={prevStep} variant="outline" >
              Previous Step
            </Button>
            <Button onClick={nextStep}>
              Next Step
            </Button>
          </Group>
        </Group>
        <TextInput
          placeholder="Enter your question name"
          label="Question name"
          required
        />
        <Select
          label="Problem Description"
          placeholder="Choose a template"
          w={240}
          data={templates}
          value={selectedTemplate}
          onChange={handleTemplateChange}
        />
        <Paper shadow="sm">
          <RichTextEditor
            key={selectedTemplate}
            extensions={extensions}
            content={content}
            onChangeContent={setContent}
            output='html'
          />
        </Paper>
        <Group justify="flex-end">
          <Button onClick={prevStep} variant="outline" >
            Previous Step
          </Button>
          <Button onClick={nextStep}>
            Next Step
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}

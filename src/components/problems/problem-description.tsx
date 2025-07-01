import { Button, Flex, Group, Paper, Select, Stack, TextInput, Title, Text, Loader } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { DEFAULT_PROBLEM_TEMPLATE } from "./problem-template-html.ts";
import RichTextEditor from 'reactjs-tiptap-editor'
import { extensions } from 'lib/react-tiptap-editor';
import { useSessionStorage } from "hooks/useSessionStorage";
import { useProblem } from "hooks/useProblem.ts";
import { useMemo, useEffect, useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";

interface ProblemDescriptionProps {
  nextStep: () => void;
  prevStep: () => void;
  problemId?: string;
  problemName?: string;
  content?: string;
};

export function ProblemDescription({ nextStep, prevStep, problemId, problemName: initialProblemName, content: initialContent }: ProblemDescriptionProps) {

  // use session storage to store the content, but initialize with props if available
  const [problemName, setProblemName] = useSessionStorage<string>("problemName", initialProblemName || "");
  const [content, setContent] = useSessionStorage<string>("problemContent", initialContent || DEFAULT_PROBLEM_TEMPLATE);
  const [debouncedProblemName] = useDebouncedValue(problemName, 300);
  const [debouncedContent] = useDebouncedValue(content, 300)
  const [editorKey, setEditorKey] = useSessionStorage<number>("editorKey", 0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { saveProblemDetailsMutation } = useProblem();

  // Local state validation - ensure both fields are properly defined
  const isFormValid = useMemo(() => {
    const trimmedName = problemName?.trim();
    const trimmedContent = content?.trim();

    return !!(
      trimmedName &&
      trimmedName.length > 0 &&
      trimmedContent &&
      trimmedContent.length > 0 &&
      trimmedContent !== DEFAULT_PROBLEM_TEMPLATE.trim()
    );
  }, [problemName, content]);

  const { mutate, isPending, isSuccess } = saveProblemDetailsMutation();

  // Update last saved time when save is successful
  useEffect(() => {
    if (isSuccess) {
      setLastSaved(new Date());
    }
  }, [isSuccess]);

  // Auto-save when debounced values change
  useEffect(() => {
    // Only save if we have a problem ID and both fields have meaningful content
    if (
      problemId &&
      debouncedProblemName?.trim() &&
      debouncedContent?.trim() &&
      debouncedContent.trim() !== DEFAULT_PROBLEM_TEMPLATE.trim()
    ) {
      mutate({
        id: problemId,
        problemName: debouncedProblemName.trim(),
        content: debouncedContent.trim()
      });
    }
  }, [debouncedProblemName, debouncedContent, problemId, mutate]);

  // Initialize session storage with props when they change
  useEffect(() => {
    if (initialProblemName && initialProblemName !== problemName) {
      setProblemName(initialProblemName);
    }
  }, [initialProblemName, problemName, setProblemName]);

  useEffect(() => {
    if (initialContent && initialContent !== content) {
      setContent(initialContent);
    }
  }, [initialContent, content, setContent]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleReset = () => {
    setContent(DEFAULT_PROBLEM_TEMPLATE);
    setEditorKey((editorKey || 0) + 1); // Force re-render by changing key
  };

  const handleNextStep = () => {
    if (!isFormValid) {
      return;
    }
    // Since auto-save is already handling the saving, we can just proceed to next step
    // But ensure we save any pending changes first
    if (problemId && problemName?.trim() && content?.trim()) {
      mutate({
        id: problemId,
        problemName: problemName.trim(),
        content: content.trim()
      });
    }
    nextStep();
  }

  return (
    <Paper>
      <Stack>
        <Group justify="space-between">
          <Title> Problem Details</Title>
          <Group>
            {isPending && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Auto-saving...
                </Text>
              </Group>
            )}
            {!isPending && lastSaved && (
              <Group gap="xs">
                <IconCheck size={16} color="green" />
                <Text size="sm" c="green">
                  Saved {lastSaved.toLocaleTimeString()}
                </Text>
              </Group>
            )}
            <Button onClick={prevStep} variant="outline" >
              Previous Step
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={!isFormValid}
            >
              Next Step
            </Button>
          </Group>
        </Group>
        <TextInput
          placeholder="Enter the name of your problem"
          label="Problem name"
          required
          value={problemName || ""}
          onChange={(e) => setProblemName(e.currentTarget.value)}
          error={problemName?.trim() === "" ? "Problem name is required" : null}
        />
        <Group>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </Group>
        <Paper shadow="sm">
          <RichTextEditor
            key={editorKey}
            extensions={extensions}
            content={content || DEFAULT_PROBLEM_TEMPLATE}
            onChangeContent={handleContentChange}
            output='html'
          />
        </Paper>
        <Group justify="flex-end">
          <Button onClick={prevStep} variant="outline" >
            Previous Step
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={!isFormValid}
          >
            Next Step
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}


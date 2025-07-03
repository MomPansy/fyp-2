import { Group, Loader, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";
import { useAutoSaveProblemContent, useAutoSaveProblemName } from "hooks/useProblem";
import { useEffect, useState } from "react";
import { SimpleEditor } from "components/tiptap-templates/simple/simple-editor";
import { UseEditorOptions } from "@tiptap/react";
import { editor } from "monaco-editor";

interface ProblemDescriptionProps {
  problemId: string;
  problemName: string;
  problemContent: string;
}

function useSaveStatus(
  nameSuccess: boolean,
  namePending: boolean,
  contentSuccess: boolean,
  contentPending: boolean
) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const isPending = namePending || contentPending;
  const isSuccess = nameSuccess || contentSuccess;

  useEffect(() => {
    // Update last saved time when either operation succeeds and nothing is pending
    if (isSuccess && !isPending) {
      setLastSaved(new Date());
    }
  }, [isSuccess, isPending]);

  useEffect(() => {
    // Manage visibility for smooth transitions
    if (lastSaved) {
      setIsVisible(true);
    } else {
      // Delay hiding to allow for smooth fade out
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  // Always render the same structure to prevent layout shifts
  return (
    <Group
      gap="xs"
      style={{
        minWidth: '120px',
        opacity: lastSaved ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
        height: '16px', // Fixed height to prevent vertical shifts
        alignItems: 'center'
      }}
    >
      {lastSaved ? (
        <>
          <IconCheck size={16} color="green" style={{
            animation: 'fadeIn 0.3s ease-in-out'
          }} />
          <Text size="xs" c="green" style={{ whiteSpace: 'nowrap' }}>
            Saved {lastSaved.toLocaleTimeString()}
          </Text>
        </>
      ) : null}
    </Group>
  );
}


export function ProblemDescription({
  problemId,
  problemName: initialProblemName,
  problemContent: initialContent
}: ProblemDescriptionProps) {
  const { mutate: saveContentMutate, isPending: saveContentPending, isSuccess: saveContentSuccess } = useAutoSaveProblemContent();
  const { mutate: saveNameMutate, isPending: saveNamePending, isSuccess: saveNameSuccess } = useAutoSaveProblemName();

  const form = useForm({
    initialValues: {
      name: initialProblemName,
    },
    onValuesChange: ({ name }) => {
      debouncedSaveName(name);
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Problem name is required"),
    }
  });

  const onUpdate: UseEditorOptions["onUpdate"] = ({ editor }) => {
    const content = editor.getHTML()
    debouncedSaveContent(content);
  }

  // Debounced save function - only saves if form is valid
  const debouncedSaveContent = useDebouncedCallback(
    (content: string) => {
      const errors = form.validate();
      if (!errors.hasErrors) {
        saveContentMutate({
          id: problemId,
          content: content
        });
      }
    }, 500)
  const debouncedSaveName = useDebouncedCallback(
    (name: string) => {
      const errors = form.validate();
      if (!errors.hasErrors) {
        saveNameMutate({
          id: problemId,
          name: name
        });
      }
    }, 500)


  const saveStatus = useSaveStatus(
    saveNameSuccess,
    saveNamePending,
    saveContentSuccess,
    saveContentPending
  );
  return (
    <Stack>
      <TextInput
        placeholder="Enter the name of your problem"
        label="Problem name"
        required
        {...form.getInputProps('name')}
      />
      <SimpleEditor
        onUpdate={onUpdate}
        initialContent={initialContent}
        saveStatus={saveStatus}
      />
    </Stack>
  )
}
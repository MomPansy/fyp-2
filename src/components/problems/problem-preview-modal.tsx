import { Code, Divider, Modal, Stack, Text } from "@mantine/core";
import { SimpleEditor } from "@/components/tiptap/simple/simple-editor.tsx";

export interface ProblemPreviewData {
  name: string;
  description: string;
  answer?: string | null;
}

interface ProblemPreviewModalProps {
  problem: ProblemPreviewData | null;
  onClose: () => void;
  showAnswer?: boolean;
}

export function ProblemPreviewModal({
  problem,
  onClose,
  showAnswer = false,
}: ProblemPreviewModalProps) {
  return (
    <Modal
      opened={!!problem}
      onClose={onClose}
      size="auto"
      title={problem?.name}
    >
      <Modal.Body>
        <Stack>
          <SimpleEditor
            initialContent={problem?.description ?? ""}
            readonly
            styles={{
              editor: { maxWidth: "1400px", padding: 0 },
            }}
            showToolbar={false}
          />
          {showAnswer && (
            <>
              <Divider />
              <div>
                <Text fw="bold" size="sm" mb="xs">
                  Answer
                </Text>
                <Code block>{problem?.answer ?? "No answer provided"}</Code>
              </div>
            </>
          )}
        </Stack>
      </Modal.Body>
    </Modal>
  );
}

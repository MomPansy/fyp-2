import { Panel } from "react-resizable-panels";
import MonacoEditorReact from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { useRef, useState } from "react";
import { Button, Select, Group, Modal, Text, Checkbox } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlayerPlay, IconCheck } from "@tabler/icons-react";
import {
  SUPPORTED_DIALECTS,
  type Dialect,
} from "server/problem-database/mappings.ts";
import { useExecuteSQLMutation } from "@/hooks/use-problem.ts";
import { showErrorNotification } from "@/components/notifications.ts";

interface SqlEditorProps {
  podName?: string;
}

// Map dialect values to user-friendly labels
const dialectLabels: Record<Dialect, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  sqlserver: "SQL Server",
  oracle: "Oracle",
};

const sqlDialects = SUPPORTED_DIALECTS.map((dialect) => ({
  value: dialect,
  label: dialectLabels[dialect],
}));

export function SqlEditor({ podName }: SqlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const { mutate, isPending } = useExecuteSQLMutation();

  const [sqlCode, setSqlCode] = useState<string | undefined>(
    `SELECT * FROM CITY WHERE COUNTRYCODE = 'USA' AND POPULATION > 100000`,
  );

  const [sqlDialect, setSqlDialect] = useState<Dialect>("postgres");
  const [opened, { open, close }] = useDisclosure(false);

  const handleDialectChange = (value: string | null) => {
    if (value && SUPPORTED_DIALECTS.includes(value as Dialect)) {
      setSqlDialect(value as Dialect);
    }
  };

  const handleTest = () => {
    if (!sqlCode) return;
    if (!podName) {
      showErrorNotification({
        title: "Database Connection Error",
        message:
          "No database connection available. Please ensure the problem is set up correctly.",
      });
      return;
    }
    mutate({
      podName,
      sql: sqlCode,
      dialect: sqlDialect,
    });
  };

  const handleSaveAnswer = () => {
    open();
  };

  const handleConfirmSave = (saveAsTemplate: boolean) => {
    // TODO: Implement database operation here
    // This would typically involve saving the SQL answer and optionally as a template
    console.info("Saving answer...", {
      sqlCode,
      sqlDialect,
      saveAsTemplate,
    });

    close();
  };

  return (
    <Panel defaultSize={60} minSize={20}>
      <div className="flex flex-col h-full">
        {/* SQL Dialect Selector and Action Buttons */}
        <div className="flex justify-between items-center p-2 border-b border-gray-200">
          <Select
            data={sqlDialects}
            value={sqlDialect}
            onChange={handleDialectChange}
            placeholder="Select SQL dialect"
            className="w-40"
          />
          <Group>
            <Button
              variant="outline"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={handleTest}
              loading={isPending}
            >
              Test
            </Button>
            <Button
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={handleSaveAnswer}
              loading={isPending}
            >
              Save Answer
            </Button>
          </Group>
        </div>
        <div className="flex-1 min-h-0">
          <MonacoEditorReact
            height="100%"
            defaultLanguage="sql"
            value={sqlCode}
            onChange={(value: string | undefined) =>
              setSqlCode(value ?? undefined)
            }
            onMount={(editorInstance: editor.IStandaloneCodeEditor) => {
              editorRef.current = editorInstance;
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </div>

        <ConfirmationModal
          isOpen={opened}
          onClose={close}
          onConfirm={handleConfirmSave}
        />
      </div>
    </Panel>
  );
}
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saveAsTemplate: boolean) => void;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmationModalProps) {
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const handleConfirm = () => {
    onConfirm(saveAsTemplate);
    // Reset checkbox for next time
    setSaveAsTemplate(false);
  };

  const handleClose = () => {
    // Reset checkbox when modal is closed
    setSaveAsTemplate(false);
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="Save Problem"
      withCloseButton={false}
    >
      <Text size="sm">
        You can optionally save your problem as a template for other users to
        reference.
      </Text>

      <Group justify="space-between" mt="md">
        <Checkbox
          checked={saveAsTemplate}
          onChange={(event) => setSaveAsTemplate(event.currentTarget.checked)}
          label="Save as template"
        />
        <Group>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button color="green" onClick={handleConfirm}>
            Save Answer
          </Button>
        </Group>
      </Group>
    </Modal>
  );
}

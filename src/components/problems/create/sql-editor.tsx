import { Panel } from "react-resizable-panels";
import MonacoEditorReact from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { useRef, useState } from "react";
import { Button, Select, Group } from "@mantine/core";
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

  // TODO: implement
  // const onDialectChange = () => {
  //   // pass
  // }

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
              onClick={handleTest}
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
      </div>
    </Panel>
  );
}

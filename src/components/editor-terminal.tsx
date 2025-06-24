import { useRef, useState } from "react"
import { Group, Text, Button, Select, Box, Stack, ActionIcon, Tooltip, Divider, Title } from "@mantine/core"
import { IconMaximize, IconPlayerPlay } from "@tabler/icons-react"
import Editor, { EditorProps } from "@monaco-editor/react"
import { editor as MonacoEditor } from "monaco-editor"

// Sample test result data
const sampleTestResult = {
  success: true,
  message: "Test passed successfully",
  data: [
    { ID: 3878, NAME: "New York", COUNTRYCODE: "USA", DISTRICT: "New York", POPULATION: 8008278 },
    { ID: 3805, NAME: "Los Angeles", COUNTRYCODE: "USA", DISTRICT: "California", POPULATION: 3694820 },
    { ID: 3812, NAME: "Chicago", COUNTRYCODE: "USA", DISTRICT: "Illinois", POPULATION: 2896016 },
  ]
};

// Available SQL dialects
const sqlDialects = [
  { value: "MySQL", label: "MySQL" },
  { value: "PostgreSQL", label: "PostgreSQL" },
  { value: "SQLite", label: "SQLite" },
  { value: "SQL Server", label: "SQL Server" },
  { value: "Oracle", label: "Oracle" }
];

export function EditorTerminal() {
  const [sqlDialect, setSqlDialect] = useState<string | null>("MySQL");
  const [sqlCode, setSqlCode] = useState<string | undefined>("SELECT * FROM CITY WHERE COUNTRYCODE = 'USA' AND POPULATION > 100000");
  const [terminalOutput, setTerminalOutput] = useState<typeof sampleTestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: EditorProps['onMount'] = (editor) => {
    editorRef.current = editor;
  }

  // Test SQL query
  const testQuery = () => {
    setIsTesting(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setTerminalOutput(sampleTestResult);
      setIsTesting(false);
    }, 1000);
  };

  // Submit SQL query
  const submitQuery = () => {
    setIsSubmitting(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setTerminalOutput({
        success: true,
        message: "Your solution passed all test cases!",
        data: sampleTestResult.data
      });
      setIsSubmitting(false);
    }, 1500);
  };

  // Render terminal output
  const renderTerminalOutput = () => {
    if (!terminalOutput) {
      return (
        <Text c="dimmed" p="md">
          Run your SQL query to see results here
        </Text>
      );
    }

    return (
      <div className="p-4">
        <Text c={terminalOutput.success ? "green" : "red"} fw={600} mb="md">
          {terminalOutput.message}
        </Text>

        {terminalOutput.data && (
          <Box className="overflow-auto max-h-64">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {Object.keys(terminalOutput.data[0]).map((key) => (
                    <th key={key} className="border border-gray-300 px-4 py-2 text-left">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {terminalOutput.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {Object.values(row).map((value, valueIndex) => (
                      <td key={valueIndex} className="border border-gray-300 px-4 py-2">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </div>
    );
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <Title order={3} fw={500}>
            SQL Editor
          </Title>
        </Group>
        <Group>
          <Select
            data={sqlDialects}
            value={sqlDialect}
            onChange={(value) => setSqlDialect(value)}
            placeholder="Select SQL dialect"
            className="w-40"
          />
          <Button
            variant="outline"
            leftSection={<IconPlayerPlay size={16} />}
            onClick={testQuery}
            loading={isTesting}
          >
            Run
          </Button>
        </Group>
      </Group>
      <Divider dir="horizontal" />
      <Box mih={300}>
        <Editor
          height="300px"
          defaultLanguage="sql"
          value={sqlCode}
          onChange={(e) => setSqlCode(e)}
          onMount={(editor) => { editorRef.current = editor }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true
          }}
        />
      </Box>

      {/* Terminal Output Section */}
      <Box style={{
        backgroundColor: "#111827",
        color: "white",
        display: "flex",
        flexDirection: "column",
        overflow: "auto"
      }}>
        <Box className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <Text fw={600}>Results</Text>
          <Tooltip label="Maximize">
            <ActionIcon variant="subtle" color="gray">
              <IconMaximize size={16} />
            </ActionIcon>
          </Tooltip>
        </Box>
        <Box style={{ flexGrow: 1, overflow: "auto" }}>
          {renderTerminalOutput()}
        </Box>
      </Box>
    </Stack>
  );
}
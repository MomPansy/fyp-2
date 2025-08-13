import React from 'react';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { databaseConnectionQueryOptions, problemDetailQueryOptions } from '@/hooks/use-problem';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Editor from "@monaco-editor/react"
import { editor as MonacoEditor } from "monaco-editor"
import { useRef, useState } from 'react';
import { Box, Text, Tooltip, ActionIcon, Button, Select, Group } from '@mantine/core';
import { IconMaximize, IconPlayerPlay, IconCheck } from '@tabler/icons-react';

export const Route = createFileRoute('/_admin/admin/problem/$id/create')({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const problemDetails = await queryClient.ensureQueryData(problemDetailQueryOptions(params.id, {
        columns: ['description']
      }))
      const databaseConnectionKey = await queryClient.ensureQueryData(databaseConnectionQueryOptions(params.id, 'postgres'));

      if (!problemDetails) {
        throw new Error('Problem not found');
      }

      return {
        problemDetails,
        databaseConnectionKey
      };
    } catch (error) {
      console.error('Failed to load problem data:', error);
      // Return null/undefined to let the component handle placeholders
      return undefined;
    }
  },
  component: RouteComponent,
});

function RouteComponent(): JSX.Element {
  const loaderData = Route.useLoaderData();

  // Provide placeholder data if loader data is not available
  const problemDetails = loaderData?.problemDetails || {
    description: `
      <h2>Problem Description</h2>
      <p>This is a placeholder problem description. The actual problem data could not be loaded.</p>
      <p>Please check your connection and try again, or contact support if the issue persists.</p>
    `
  };

  const databaseConnectionKey = loaderData?.databaseConnectionKey || {
    host: 'localhost',
    port: 5432,
    database: 'placeholder_db',
    username: 'placeholder_user'
  };

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [sqlCode, setSqlCode] = useState<string | undefined>(`SELECT * FROM CITY WHERE COUNTRYCODE = 'USA' AND POPULATION > 100000`);

  // SQL dialects and selection state
  const sqlDialects = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'mssql', label: 'SQL Server' },
  ];
  const [sqlDialect, setSqlDialect] = useState<string | null>('postgresql');

  // Sample test result data (reference from EditorTerminal)
  const sampleTestResult = {
    success: true,
    message: 'Test passed successfully',
    data: [
      { ID: 3878, NAME: 'New York', COUNTRYCODE: 'USA', DISTRICT: 'New York', POPULATION: 8008278 },
      { ID: 3805, NAME: 'Los Angeles', COUNTRYCODE: 'USA', DISTRICT: 'California', POPULATION: 3694820 },
      { ID: 3812, NAME: 'Chicago', COUNTRYCODE: 'USA', DISTRICT: 'Illinois', POPULATION: 2896016 },
    ],
  };

  const [terminalOutput, setTerminalOutput] = useState<typeof sampleTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const testQuery = () => {
    setIsTesting(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setTerminalOutput(sampleTestResult);
      setIsTesting(false);
    }, 1000);
  };

  const submitQuery = () => {
    setIsSubmitting(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setTerminalOutput({ ...sampleTestResult, message: 'Submission received' });
      setIsSubmitting(false);
    }, 1000);
  };

  const renderTerminalOutput = () => {
    const t = terminalOutput;
    if (!t) {
      return (
        <Text c="dimmed" p="md">
          Run your SQL query to see results here
        </Text>
      );
    }

    return (
      <div className="p-4">
        <Text c={t.success ? 'green' : 'red'} fw={600} mb="md">
          {t.message}
        </Text>

        {t.data?.length ? (
          <Box className="overflow-auto max-h-64">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {Object.keys(t.data[0]).map((key) => (
                    <th key={key} className="border border-gray-300 px-4 py-2 text-left">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.values(row).map((value, valueIndex) => (
                      <td key={valueIndex} className="border border-gray-300 px-4 py-2">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : null}
      </div>
    );
  };

  return (
    <PanelGroup direction='horizontal' className='h-full'>
      <Panel defaultSize={40} minSize={25}>
        <SimpleEditor initialContent={problemDetails.description} readonly />
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={60} minSize={40}>
        <PanelGroup direction='vertical' className='h-full'>
          <Panel defaultSize={60} minSize={20}>
            {/* sql editor here */}
            <div className="flex flex-col h-full">
              {/* SQL Dialect Selector and Action Buttons */}
              <div className="flex justify-between items-center p-2 border-b border-gray-200">
                <Select
                  data={sqlDialects}
                  value={sqlDialect}
                  onChange={setSqlDialect}
                  placeholder="Select SQL dialect"
                  className="w-40"
                />
                <Group>
                  <Button
                    variant="outline"
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={testQuery}
                    loading={isTesting}
                  >
                    Test
                  </Button>
                  <Button
                    color="green"
                    leftSection={<IconCheck size={16} />}
                    onClick={submitQuery}
                    loading={isSubmitting}
                  >
                    Save Answer
                  </Button>
                </Group>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="sql"
                  value={sqlCode}
                  onChange={(value) => setSqlCode(value ?? undefined)}
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
              </div>
            </div>
          </Panel>
          <PanelResizeHandle />
          <Panel defaultSize={40} minSize={15}>
            {/* terminal here */}
            <Box
              style={{
                backgroundColor: '#111827',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                height: '100%'
              }}
            >
              <Box className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                <Text fw={600}>Results</Text>
                <Tooltip label="Maximize">
                  <ActionIcon variant="subtle" color="gray">
                    <IconMaximize size={16} />
                  </ActionIcon>
                </Tooltip>
              </Box>
              <Box style={{ flexGrow: 1, overflow: 'auto' }}>
                {renderTerminalOutput()}
              </Box>
            </Box>
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

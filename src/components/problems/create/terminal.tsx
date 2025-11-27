import { Panel } from "react-resizable-panels";
import {
  Box,
  Text,
  Tooltip,
  ActionIcon,
  Table,
  ScrollArea,
} from "@mantine/core";
import { IconMaximize, IconCheck, IconX } from "@tabler/icons-react";
import { useMutationState } from "@tanstack/react-query";
import { SUBMIT_ASSESSMENT_MUTATION_KEY } from "./hooks.ts";

// Type definitions based on the API response structure
interface QuerySuccess {
  rows?: Record<string, unknown>[];
  rowCount?: number;
  affectedRows?: number;
}

interface QueryError {
  error: string;
}

type QueryResult = QuerySuccess | QueryError;

// Type for assessment submission result
interface SubmitAssessmentResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  grade?: "pass" | "failed";
  gradeError?: string;
  error?: string;
}

function isQueryError(data: QueryResult): data is QueryError {
  return "error" in data;
}

export function Terminal() {
  const result = useMutationState({
    filters: { mutationKey: ["problem-execute-sql-mutation-key"] },
    select: (mutation) => ({
      data: mutation.state.data as QueryResult | undefined,
      status: mutation.state.status,
    }),
  });

  const assessmentResult = useMutationState({
    filters: { mutationKey: SUBMIT_ASSESSMENT_MUTATION_KEY },
    select: (mutation) => ({
      data: mutation.state.data as SubmitAssessmentResult | undefined,
      status: mutation.state.status,
    }),
  });

  const renderAssessmentOutput = () => {
    if (assessmentResult.length === 0) {
      return null;
    }

    const latestResult = assessmentResult[assessmentResult.length - 1];
    const t = latestResult.data;

    if (!t) {
      return null;
    }

    // Handle error case
    if (t.error) {
      return (
        <div className="p-4">
          <Text c="red" fw={600} mb="md">
            Submission failed
          </Text>
          <Text
            c="red"
            style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
          >
            {t.error}
          </Text>
        </div>
      );
    }

    // Handle grade result
    if (t.grade === "pass") {
      return (
        <div className="p-4">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <IconCheck size={24} color="#10B981" />
            <Text c="green" fw={700} size="lg">
              All tests passed!
            </Text>
          </Box>
          <Text c="dimmed" size="sm">
            Great work! Your solution produces the correct output.
          </Text>
        </div>
      );
    }

    if (t.grade === "failed") {
      return (
        <div className="p-4">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <IconX size={24} color="#EF4444" />
            <Text c="red" fw={700} size="lg">
              Tests failed
            </Text>
          </Box>
          <Text c="dimmed" size="sm" mb="md">
            Your solution did not produce the expected output. Review your query
            and try again.
          </Text>
          {t.gradeError && (
            <Text
              c="red"
              style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
              size="sm"
            >
              {t.gradeError}
            </Text>
          )}
        </div>
      );
    }

    return null;
  };

  const renderTerminalOutput = () => {
    if (result.length === 0) {
      return (
        <Text c="dimmed" p="md">
          Run your SQL query to see results here
        </Text>
      );
    }

    const latestResult = result[result.length - 1];
    const t = latestResult.data;

    if (!t) {
      return (
        <Text c="dimmed" p="md">
          Run your SQL query to see results here
        </Text>
      );
    }

    // Handle error case
    if (isQueryError(t)) {
      return (
        <div className="p-4">
          <Text c="red" fw={600} mb="md">
            Query execution failed
          </Text>
          <Text
            c="red"
            style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
          >
            {t.error}
          </Text>
        </div>
      );
    }

    // Handle success case - t is now QuerySuccess
    if (!t.rows || t.rows.length === 0) {
      return (
        <div className="p-4">
          <Text c="green" fw={600} mb="md">
            Query executed successfully {" — "}{" "}
            {t.rowCount ?? t.affectedRows ?? 0} rows affected
          </Text>
          <Text c="dimmed" p="md">
            No data returned from query
          </Text>
        </div>
      );
    }

    const columns = Array.from(new Set(t.rows.flatMap((r) => Object.keys(r))));

    const formatValue = (v: unknown): string => {
      if (v === null || v === undefined) {
        return "NULL";
      }
      if (typeof v === "object") {
        return JSON.stringify(v);
      }
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(v);
    };

    const renderCell = (v: unknown) => {
      if (v === null || v === undefined) {
        return <span className="text-gray-400 italic">NULL</span>;
      }
      return formatValue(v);
    };

    return (
      <div className="p-4">
        <Text c="green" fw={600} mb="md">
          Query executed successfully — {t.rowCount} rows returned
        </Text>

        {t.rows.length > 0 ? (
          <Table
            highlightOnHover
            withTableBorder
            withColumnBorders
            stickyHeader
            style={{
              fontSize: "13px",
              fontFamily: "monospace",
            }}
          >
            <Table.Thead>
              <Table.Tr>
                {columns.map((key) => (
                  <Table.Th
                    key={key}
                    style={{
                      color: "#9CA3AF",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontSize: "11px",
                      padding: "8px 12px",
                      borderBottom: "1px solid #374151",
                      backgroundColor: "#111827",
                    }}
                  >
                    {key}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {t.rows.map((row, i) => (
                <Table.Tr key={i}>
                  {columns.map((key, j) => {
                    const val = row[key];
                    const full = formatValue(val);
                    return (
                      <Table.Td
                        key={j}
                        style={{
                          color: "#E5E7EB",
                          padding: "8px 12px",
                          borderBottom: "1px solid #374151",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Tooltip
                          label={full}
                          openDelay={300}
                          withArrow
                          position="bottom-start"
                        >
                          <div
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "28rem",
                            }}
                          >
                            {renderCell(val)}
                          </div>
                        </Tooltip>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed" p="md">
            No data returned from query
          </Text>
        )}
      </div>
    );
  };

  return (
    <Panel defaultSize={40} minSize={15}>
      <Box
        style={{
          backgroundColor: "#111827",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
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
        <ScrollArea style={{ flex: 1 }} type="auto">
          {renderAssessmentOutput()}
          {renderTerminalOutput()}
        </ScrollArea>
      </Box>
    </Panel>
  );
}

import { Panel } from "react-resizable-panels";
import { Box, Text, Tooltip, ActionIcon } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { useMutationState } from "@tanstack/react-query";

// Define the expected structure of the SQL execution result
interface SqlExecutionResult {
  success: boolean;
  message: string;
  data: Record<string, unknown>[] | undefined;
}

export function Terminal() {
  const result = useMutationState({
    filters: { mutationKey: ["problem-execute-sql-mutation-key"] },
    select: (mutation) => ({
      data: mutation.state.data as SqlExecutionResult | undefined,
      status: mutation.state.status,
    }),
  });

  const renderTerminalOutput = () => {
    // Get the latest result from the array - result array could be empty
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

    return (
      <div className="p-4">
        <Text c={t.success ? "green" : "red"} fw={600} mb="md">
          {t.message}
        </Text>

        {t.data && t.data.length > 0 ? (
          <Box className="overflow-auto max-h-64">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {Object.keys(t.data[0]).map((key: string) => (
                    <th
                      key={key}
                      className="border border-gray-300 px-4 py-2 text-left"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.data.map(
                  (row: Record<string, unknown>, rowIndex: number) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {Object.values(row).map(
                        (value: unknown, valueIndex: number) => (
                          <td
                            key={valueIndex}
                            className="border border-gray-300 px-4 py-2"
                          >
                            {String(value)}
                          </td>
                        ),
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </Box>
        ) : null}
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
          overflow: "auto",
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
        <Box style={{ flexGrow: 1, overflow: "auto" }}>
          {renderTerminalOutput()}
        </Box>
      </Box>
    </Panel>
  );
}

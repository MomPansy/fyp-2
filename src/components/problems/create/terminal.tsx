import { Panel } from "react-resizable-panels";
import {
  Box,
  Text,
  Tooltip,
  ActionIcon,
  Table,
  ScrollArea,
} from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { useMutationState } from "@tanstack/react-query";
import { QueryResult } from "../../../../server/problem-database/db-seed/types.ts";

// Define the expected structure of the SQL execution result

export function Terminal() {
  const result = useMutationState({
    filters: { mutationKey: ["problem-execute-sql-mutation-key"] },
    select: (mutation) => ({
      data: mutation.state.data as QueryResult,
      status: mutation.state.status,
    }),
  });

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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!t) {
      return (
        <Text c="dimmed" p="md">
          Run your SQL query to see results here
        </Text>
      );
    }

    // Check if this is an error result
    if ("error" in t) {
      return (
        <div className="p-4">
          <Text c="red" fw={600} mb="md">
            Query failed
          </Text>
          <Box
            style={{
              backgroundColor: "#1F2937",
              border: "1px solid #991B1B",
              borderRadius: "4px",
              padding: "12px",
            }}
          >
            <Text c="red" style={{ fontFamily: "monospace", fontSize: "13px" }}>
              {t.error}
            </Text>
          </Box>
        </div>
      );
    }

    // Success result - render table
    const rows = t.rows ?? [];
    const rowCount = t.rowCount ?? rows.length;
    const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

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
          Query executed successfully — {rowCount} row
          {rowCount !== 1 ? "s" : ""}{" "}
          {rows.length > 0 ? "returned" : "affected"}
        </Text>

        {rows.length > 0 ? (
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
              {rows.map((row, i) => (
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
          <Text
            c="dimmed"
            style={{ fontFamily: "monospace", fontSize: "13px" }}
          >
            Query executed successfully (no rows returned)
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
          {renderTerminalOutput()}
        </ScrollArea>
      </Box>
    </Panel>
  );
}

import { Skeleton, Group, Box } from "@mantine/core";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

export function PendingComponent() {
  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={40} minSize={25}>
        <Skeleton className="h-full" />
      </Panel>
      {/* Vertical Resize Handle between Left and Right */}
      <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-gray-400 transition-colors">
        <div className="h-full flex items-center justify-center">
          <div className="w-1 h-8 bg-gray-500 rounded"></div>
        </div>
      </PanelResizeHandle>
      <Panel defaultSize={60} minSize={40}>
        <PanelGroup direction="vertical" className="h-full">
          <Panel defaultSize={60} minSize={20}>
            {/* sql editor here */}
            <div className="flex flex-col h-full">
              {/* SQL Dialect Selector and Action Buttons */}
              <div className="flex justify-between items-center p-2 border-b border-gray-200">
                <Skeleton height={36} width={160} />
                <Group>
                  <Skeleton height={36} width={80} />
                  <Skeleton height={36} width={120} />
                </Group>
              </div>
              <div className="flex-1 min-h-0">
                <Skeleton className="h-full" />
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="h-2 bg-gray-300 hover:bg-gray-400 transition-colors">
            <div className="w-full flex items-center justify-center">
              <div className="h-1 w-8 bg-gray-500 rounded"></div>
            </div>
          </PanelResizeHandle>
          <Panel defaultSize={40} minSize={15}>
            {/* terminal here */}
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
                <Skeleton height={20} width={60} variant="text" />
                <Skeleton height={24} width={24} />
              </Box>
              <Box style={{ flexGrow: 1, overflow: "auto", padding: "8px" }}>
                <Skeleton height={20} width="100%" mb="xs" />
                <Skeleton height={20} width="80%" mb="xs" />
                <Skeleton height={20} width="60%" mb="xs" />
                <Skeleton height={20} width="90%" />
              </Box>
            </Box>
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

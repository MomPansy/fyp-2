import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  databaseConnectionQueryOptions,
  problemDetailQueryOptions,
} from "@/hooks/use-problem.ts";
import { PendingComponent } from "@/components/problems/create/route-skeleton.tsx";
import {
  ProblemDescription,
  SqlEditor,
  Terminal,
} from "@/components/problems/create/index.ts";

export const Route = createFileRoute("/_admin/admin/problem/$id/create")({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const problemDetails = await queryClient.ensureQueryData(
        problemDetailQueryOptions(params.id, {
          columns: ["description"],
        }),
      );
      const databaseConnectionKey = await queryClient.ensureQueryData(
        databaseConnectionQueryOptions(params.id, "postgres"),
      );

      if (!problemDetails) {
        throw new Error("Problem not found");
      }

      return {
        problemDetails,
        databaseConnectionKey,
      };
    } catch (error) {
      console.error("Failed to load problem data:", error);
      // Return null/undefined to let the component handle placeholders
      return undefined;
    }
  },
  component: RouteComponent,
  pendingComponent: PendingComponent,
});

function RouteComponent() {
  const loaderData = Route.useLoaderData();

  // Provide placeholder data if loader data is not available
  const problemDetails = loaderData?.problemDetails ?? {
    description: `
      <h2>Problem Description</h2>
      <p>This is a placeholder problem description. The actual problem data could not be loaded.</p>
      <p>Please check your connection and try again, or contact support if the issue persists.</p>
    `,
  };

  const databaseConnectionKey = loaderData?.databaseConnectionKey;

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={40} minSize={25}>
        <ProblemDescription description={problemDetails.description} />
      </Panel>
      {/* Vertical Resize Handle between Left and Right */}
      <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-gray-400 transition-colors">
        <div className="h-full flex items-center justify-center">
          <div className="w-1 h-8 bg-gray-500 rounded"></div>
        </div>
      </PanelResizeHandle>
      <Panel defaultSize={60} minSize={40}>
        <PanelGroup direction="vertical" className="h-full">
          <SqlEditor podName={databaseConnectionKey?.podName} />
          <PanelResizeHandle className="h-2 bg-gray-300 hover:bg-gray-400 transition-colors">
            <div className="w-full flex items-center justify-center">
              <div className="h-1 w-8 bg-gray-500 rounded"></div>
            </div>
          </PanelResizeHandle>
          <Terminal />
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

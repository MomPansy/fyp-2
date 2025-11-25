import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelGroup } from "react-resizable-panels";
import {
  databaseConnectionQueryOptions,
  userProblemDetailQueryOptions,
} from "@/hooks/use-problem.ts";
import { PendingComponent } from "@/components/problems/create/route-skeleton.tsx";
import {
  ProblemDescription,
  SqlEditor,
  Terminal,
} from "@/components/problems/create/index.ts";
import { accessTokenQueryOptions } from "@/hooks/auth.ts";
import {
  HorizontalResizeHandle,
  VerticalResizeHandle,
} from "@/components/resize-handles.tsx";

export const Route = createFileRoute("/_admin/admin/problem/$id/create")({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const { payload: jwtPayload } = await queryClient.ensureQueryData(
        accessTokenQueryOptions,
      );
      const userId = jwtPayload.user_metadata.user_id;
      const problemDetails = await queryClient.ensureQueryData(
        userProblemDetailQueryOptions(params.id, userId, {
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
  const { id } = Route.useParams();

  // Provide placeholder data if loader data is not available
  const problemDetails = loaderData?.problemDetails ?? {
    description: `
      <h2>Problem Description</h2>
      <p>This is a placeholder problem description. The actual problem data could not be loaded.</p>
      <p>Please check your connection and try again, or contact support if the issue persists.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque laoreet, est et volutpat pulvinar, urna nibh mattis metus, quis pretium leo eros et ex. Vestibulum quis tellus bibendum, aliquam leo a, iaculis ligula. Nam ut elit in quam vestibulum tempor. Morbi tincidunt viverra nisl, sed faucibus nisi pulvinar in. Etiam dolor nibh, ullamcorper vel dui in, maximus porttitor risus. Aenean in pharetra nisi. Fusce pellentesque massa non tincidunt efficitur. Vestibulum facilisis porta ipsum, vitae cursus quam placerat a. Vivamus tempus scelerisque dui, non elementum risus aliquet ut. Mauris ullamcorper libero quis faucibus semper. Aliquam ut orci velit. Duis mollis neque felis, in eleifend magna vehicula quis.

Suspendisse et urna urna. Aenean ut mauris lacinia, scelerisque risus nec, sodales sem. Maecenas ante turpis, sagittis suscipit ante vel, lacinia dapibus eros. Mauris malesuada porta mattis. Integer ullamcorper massa eu nulla accumsan, et condimentum turpis commodo. Quisque et sem scelerisque, pellentesque sem sed, gravida nibh. Vivamus laoreet sapien vel aliquet pharetra.

Ut vel egestas dolor. Morbi molestie dignissim ornare. In sed elementum urna, tempor mattis leo. Proin tempor augue lobortis justo dictum porta. Fusce in imperdiet velit. Nam interdum dolor vitae eros iaculis, eget facilisis enim vehicula. Ut eu accumsan neque, ut vehicula dolor. Vestibulum odio diam, lacinia sed lorem a, vestibulum ultrices velit. Nullam tincidunt dui at dapibus faucibus.

Fusce sed neque ut libero congue convallis. Vestibulum nec finibus leo. Vestibulum blandit lacus magna, sit amet tempor lorem lobortis id. Quisque pharetra, metus eu imperdiet facilisis, nulla dolor imperdiet sem, sit amet ultricies mi arcu at turpis. Morbi vestibulum purus non ullamcorper pulvinar. Vestibulum vel odio et est bibendum fringilla. Morbi id euismod eros, et interdum odio. Proin id nulla ut magna tincidunt ultrices. Vivamus ultrices laoreet fringilla. Etiam feugiat egestas ex nec finibus. Praesent facilisis ante dolor, vel commodo dolor pellentesque cursus.

Ut ut mollis nisl, eget euismod ligula. Nunc vitae dignissim erat. Cras fermentum est tortor, in lacinia sapien varius sit amet. Morbi non nibh sodales purus dignissim dapibus. Fusce sed ultricies odio, at pulvinar lorem. Proin feugiat in urna rhoncus malesuada. In ultricies, sapien sit amet convallis bibendum, arcu nisl tristique nisl, quis vestibulum ex lacus a ipsum. Cras nec ante sed magna mattis cursus. Praesent id urna felis. Aliquam vehicula turpis et diam facilisis, at laoreet lorem sagittis. Fusce consequat ligula sit amet elit dignissim, vel euismod velit efficitur. Pellentesque vel lorem tempus, sodales mi ut, consectetur velit. Fusce pulvinar libero commodo arcu fermentum, non efficitur nunc aliquam. Curabitur pharetra lorem non augue ullamcorper finibus.</p>
    `,
  };

  const databaseConnectionKey = loaderData?.databaseConnectionKey;

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={40} minSize={25}>
        <ProblemDescription description={problemDetails.description} />
      </Panel>
      {/* Vertical Resize Handle between Left and Right */}
      <VerticalResizeHandle />
      <Panel defaultSize={60} minSize={40}>
        <PanelGroup direction="vertical" className="h-full">
          <SqlEditor podName={databaseConnectionKey?.podName} problemId={id} />
          <HorizontalResizeHandle />
          <Terminal />
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}

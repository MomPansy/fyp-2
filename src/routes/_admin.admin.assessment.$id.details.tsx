import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumbs, Stack, Tabs } from "@mantine/core";
import {
  IconNumber123,
  IconSettings,
  IconUsersGroup,
} from "@tabler/icons-react";
import { fetchAssessmentQueryOptions } from "@/components/assessments/hooks.ts";
import { CustomAnchor } from "@/components/buttons/link-button.tsx";
import { ProblemsTab } from "@/components/assessments/details/problems-tab.tsx";

export const Route = createFileRoute("/_admin/admin/assessment/$id/details")({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      const data = await queryClient.ensureQueryData(
        fetchAssessmentQueryOptions(params.id),
      );
      return data;
    } catch (error) {
      console.error("Error fetching assessment data:", error);
    }
  },
  component: RouteComponent,
});

// TODO: added skeleton pending component and wrap with suspense
function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Stack>
      <Breadcrumbs separator=">">
        <CustomAnchor to="/admin/assessments">Assessments</CustomAnchor>
        <CustomAnchor to="/admin/assessment/$id/details" params={{ id }}>
          Details
        </CustomAnchor>
      </Breadcrumbs>
      <Tabs
        defaultValue="problems"
        styles={{
          tabLabel: {
            fontSize: "18px",
          },
          panel: {
            paddingTop: "2rem",
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="problems" leftSection={<IconNumber123 size={18} />}>
            Problems
          </Tabs.Tab>
          <Tabs.Tab
            value="candidates"
            leftSection={<IconUsersGroup size={18} />}
          >
            Candidates
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={18} />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="problems">
          <ProblemsTab />
        </Tabs.Panel>

        <Tabs.Panel value="candidates">Candidates tab content</Tabs.Panel>

        <Tabs.Panel value="settings">Settings tab content</Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

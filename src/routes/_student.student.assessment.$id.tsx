import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Stack, Skeleton, Container } from "@mantine/core";
import {
  fetchStudentAssessmentQueryOptions,
  useFetchStudentAssessment,
} from "@/components/student-assessments/hooks.ts";
import {
  AssessmentNotStarted,
  AssessmentEnded,
  AssessmentActive,
} from "@/components/student-assessments/assessment-display.tsx";

export const Route = createFileRoute("/_student/student/assessment/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    return await queryClient.ensureQueryData(
      fetchStudentAssessmentQueryOptions(params.id),
    );
  },
  component: RouteComponent,
});

function LoadingSkeleton() {
  return (
    <Container size="lg">
      <Stack gap="md">
        <Skeleton height={150} radius="md" />
        <Skeleton height={300} radius="md" />
        <Skeleton height={200} radius="md" />
      </Stack>
    </Container>
  );
}

function AssessmentContent() {
  const { id } = Route.useParams();
  const { data } = useFetchStudentAssessment(id);

  if (data.status === "not_started") {
    return <AssessmentNotStarted data={data} />;
  }

  if (data.status === "ended") {
    return <AssessmentEnded data={data} />;
  }

  // status === "active"
  return <AssessmentActive data={data} />;
}

function RouteComponent() {
  return (
    <Container size="lg" py="xl">
      <Suspense fallback={<LoadingSkeleton />}>
        <AssessmentContent />
      </Suspense>
    </Container>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useEffect, useCallback } from "react";
import { Stack, Skeleton, Container, Box, Text, Group } from "@mantine/core";
import { Panel, PanelGroup } from "react-resizable-panels";
import {
  fetchStudentAssessmentQueryOptions,
  useFetchStudentAssessment,
} from "@/components/student-assessments/hooks.ts";
import {
  AssessmentNotStarted,
  AssessmentEnded,
} from "@/components/student-assessments/assessment-display.tsx";
import {
  ProblemDescription,
  SqlEditor,
  Terminal,
} from "@/components/problems/create/index.ts";
import { AssessmentTimer } from "@/components/student-assessments/assessment-timer.tsx";
import { ProblemSidebar } from "@/components/student-assessments/problem-sidebar.tsx";
import {
  VerticalResizeHandle,
  HorizontalResizeHandle,
} from "@/components/resize-handles.tsx";

// Helper function to get localStorage key for an assessment
function getStorageKey(assessmentId: string): string {
  return `assessment_answers_${assessmentId}`;
}

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

function AssessmentActive() {
  const { id: assessmentId } = Route.useParams();
  const { data } = useFetchStudentAssessment(assessmentId);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState(0);

  // State to store answers for each problem
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    // Load saved answers from localStorage on mount
    try {
      const storageKey = getStorageKey(assessmentId);
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });

  // Save answers to localStorage whenever they change
  useEffect(() => {
    const storageKey = getStorageKey(assessmentId);
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, assessmentId]);

  // Handler to update answer for a specific problem
  const handleAnswerChange = useCallback((problemId: string, code: string) => {
    setAnswers((prev) => ({
      ...prev,
      [problemId]: code,
    }));
  }, []);

  if (data.status !== "active") {
    return null;
  }

  const { assessment } = data;
  const currentProblem = assessment.problems[selectedProblemIndex];
  const currentAnswer =
    answers[currentProblem.id] ??
    `SELECT * FROM CITY WHERE COUNTRYCODE = 'USA' AND POPULATION > 100000`;

  // Calculate server time offset to prevent client-side time manipulation
  // serverTimeOffset = serverTime - clientTime
  const serverTimeOffset = data.serverTime
    ? new Date(data.serverTime).getTime() - Date.now()
    : 0;

  return (
    <div className="h-screen flex flex-col">
      <Box className="bg-white border-b border-gray-200 px-6 py-3">
        <Group justify="space-between" align="center">
          <Box>
            <Text size="lg" fw={600}>
              {assessment.name}
            </Text>
            <Text size="sm" c="dimmed">
              Duration: {assessment.duration}
            </Text>
          </Box>

          <AssessmentTimer
            startTime={assessment.dateTimeScheduled}
            durationString={assessment.duration}
            endDate={assessment.endDate}
            serverTimeOffset={serverTimeOffset}
          />
        </Group>
      </Box>
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <ProblemSidebar
            problems={assessment.problems}
            selectedProblemIndex={selectedProblemIndex}
            onSelectProblem={setSelectedProblemIndex}
          />
          <Panel defaultSize={40} minSize={25}>
            <div className="h-full flex flex-col">
              <Box className="bg-white border-b border-gray-200 px-4 py-3">
                <Text size="md" fw={600} c="dark">
                  Problem {selectedProblemIndex + 1}: {currentProblem.name}
                </Text>
              </Box>
              <div className="flex-1 overflow-hidden">
                <ProblemDescription description={currentProblem.description} />
              </div>
            </div>
          </Panel>
          <VerticalResizeHandle />
          <Panel defaultSize={45} minSize={30}>
            <PanelGroup direction="vertical" className="h-full">
              <SqlEditor
                podName={undefined}
                problemId={currentProblem.id}
                initialCode={currentAnswer}
                onCodeChange={(code) =>
                  handleAnswerChange(currentProblem.id, code)
                }
              />
              <HorizontalResizeHandle />
              <Terminal />
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
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
  return <AssessmentActive />;
}

function RouteComponent() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AssessmentContent />
    </Suspense>
  );
}

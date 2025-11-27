import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Stack,
  Skeleton,
  Container,
  Box,
  Text,
  Group,
  Alert,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
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
import { databaseConnectionQueryOptions } from "@/hooks/use-problem.ts";
import { PendingComponent } from "@/components/problems/create/route-skeleton.tsx";

// Helper function to get localStorage key for an assessment
function getStorageKey(assessmentId: string): string {
  return `assessment_answers_${assessmentId}`;
}

export const Route = createFileRoute("/_student/student/assessment/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    const data = await queryClient.ensureQueryData(
      fetchStudentAssessmentQueryOptions(params.id),
    );

    const databaseConnections = new Map<
      string,
      { podName: string; dialect: string; key: string }
    >();

    if (data.status === "active") {
      const { assessment } = data;
      const { problems } = assessment;
      for (const problem of problems) {
        const connectionData = await queryClient.ensureQueryData(
          databaseConnectionQueryOptions(problem.id, "postgres"),
        );
        databaseConnections.set(problem.id, connectionData);
      }
    }

    return databaseConnections;
  },
  component: RouteComponent,
  pendingComponent: PendingComponent,
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

function ConnectionError() {
  return (
    <Box className="h-full flex items-center justify-center p-4">
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Database Connection Error"
        color="red"
        variant="filled"
      >
        Unable to connect to the database for this problem. Please try
        refreshing the page or contact support if the issue persists.
      </Alert>
    </Box>
  );
}

function AssessmentActive() {
  const { id: assessmentId } = Route.useParams();
  const { data } = useFetchStudentAssessment(assessmentId);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState(0);
  const databaseConnections = Route.useLoaderData();

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
  const currentConnection = databaseConnections.get(currentProblem.id);
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
                <ProblemDescription
                  key={currentProblem.id}
                  description={currentProblem.description}
                />
              </div>
            </div>
          </Panel>
          <VerticalResizeHandle />
          <Panel defaultSize={45} minSize={30}>
            {currentConnection ? (
              <PanelGroup direction="vertical" className="h-full">
                <SqlEditor
                  key={currentProblem.id}
                  mode="student"
                  podName={currentConnection.podName}
                  problemId={currentProblem.id}
                  assessmentId={assessmentId}
                  initialCode={currentAnswer}
                  onCodeChange={(code) =>
                    handleAnswerChange(currentProblem.id, code)
                  }
                />
                <HorizontalResizeHandle />
                <Terminal />
              </PanelGroup>
            ) : (
              <ConnectionError />
            )}
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

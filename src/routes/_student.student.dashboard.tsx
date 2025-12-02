import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Stack,
  Grid,
  Avatar,
  Paper,
  ThemeIcon,
  Box,
  Button,
  Skeleton,
  Center,
  RingProgress,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconClock,
  IconFileCheck,
  IconAlertCircle,
  IconChevronRight,
  IconBookmark,
} from "@tabler/icons-react";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase.ts";
import { useAccessToken } from "@/hooks/auth.ts";
import { dayjs } from "@/lib/dayjs.ts";

export const Route = createFileRoute("/_student/student/dashboard")({
  component: RouteComponent,
});

// Query to fetch student's upcoming assessments
const useStudentAssessments = (email: string) => {
  return useQuery({
    queryKey: ["student-dashboard-assessments", email],
    queryFn: async () => {
      // Get assessments the student is invited to
      const { data: invitations, error: invError } = await supabase
        .from("assessment_student_invitations")
        .select(
          `
          id,
          email,
          full_name,
          active,
          assessment_id,
          assessments (
            id,
            name,
            duration,
            date_time_scheduled,
            archived_at
          )
        `,
        )
        .eq("email", email)
        .is("archived_at", null);

      if (invError) throw new Error(invError.message);

      return invitations;
    },
    enabled: !!email,
  });
};

// Query to fetch student's submission history
const useStudentSubmissions = (userId: string) => {
  return useQuery({
    queryKey: ["student-submissions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_assessments")
        .select(
          `
          id,
          assessment_id,
          created_at,
          assessments (
            id,
            name
          ),
          submissions (
            id,
            created_at,
            submission_details (
              grade
            )
          )
        `,
        )
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });
};

function getAssessmentStatus(assessment: {
  archived_at: string | null;
  date_time_scheduled: string | null;
  duration: string;
}) {
  if (assessment.archived_at) {
    return { label: "Cancelled", color: "red" };
  }

  if (!assessment.date_time_scheduled) {
    return { label: "Not Scheduled", color: "gray" };
  }

  const now = dayjs();
  const scheduledDate = dayjs(assessment.date_time_scheduled);
  const duration = parseInt(assessment.duration) || 60;
  const scheduledEndTime = scheduledDate.add(duration, "minutes");

  if (now.isBefore(scheduledDate)) {
    return { label: "Upcoming", color: "blue" };
  }

  if (now.isAfter(scheduledDate) && now.isBefore(scheduledEndTime)) {
    return { label: "In Progress", color: "cyan" };
  }

  if (now.isAfter(scheduledEndTime)) {
    return { label: "Completed", color: "green" };
  }

  return { label: "Active", color: "green" };
}

function DashboardSkeleton() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Skeleton height={100} radius="md" />
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

function WelcomeCard({ name, email }: { name: string; email: string }) {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <Paper
      radius="lg"
      p="xl"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text size="lg" fw={500} opacity={0.9}>
            {greeting},
          </Text>
          <Title order={2} fw={700} mt={4}>
            {name || email.split("@")[0]}
          </Title>
          <Text size="sm" opacity={0.8} mt="xs">
            Ready for your next assessment? Check your upcoming tests below.
          </Text>
        </Box>
        <Avatar size={80} radius="xl" color="white" variant="filled">
          {(name || email)[0].toUpperCase()}
        </Avatar>
      </Group>
    </Paper>
  );
}

function StatsCards({
  totalAssessments,
  upcomingCount,
  completedCount,
}: {
  totalAssessments: number;
  upcomingCount: number;
  completedCount: number;
}) {
  const stats = [
    {
      title: "Total Assessments",
      value: totalAssessments,
      icon: IconFileCheck,
      color: "violet",
    },
    {
      title: "Upcoming",
      value: upcomingCount,
      icon: IconCalendarEvent,
      color: "blue",
    },
    {
      title: "Completed",
      value: completedCount,
      icon: IconBookmark,
      color: "green",
    },
  ];

  return (
    <Grid>
      {stats.map((stat) => (
        <Grid.Col span={{ base: 12, sm: 4 }} key={stat.title}>
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {stat.title}
                </Text>
                <Title order={2} mt={4}>
                  {stat.value}
                </Title>
              </Box>
              <ThemeIcon
                size={48}
                radius="md"
                color={stat.color}
                variant="light"
              >
                <stat.icon size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
        </Grid.Col>
      ))}
    </Grid>
  );
}

function UpcomingAssessmentCard({
  assessment,
  invitation,
}: {
  assessment: {
    id: string;
    name: string;
    duration: string;
    date_time_scheduled: string | null;
    archived_at: string | null;
  };
  invitation: {
    active: boolean;
  };
}) {
  const navigate = useNavigate();
  const status = getAssessmentStatus(assessment);
  const isAccessible =
    invitation.active &&
    (status.label === "In Progress" || status.label === "Upcoming");

  const scheduledDate = assessment.date_time_scheduled
    ? dayjs(assessment.date_time_scheduled)
    : null;

  const handleStart = () => {
    if (isAccessible) {
      navigate({
        to: "/student/assessment/$id",
        params: { id: assessment.id },
      });
    }
  };

  return (
    <Card withBorder radius="md" padding="lg" className="hover-card">
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="lg">
          {assessment.name}
        </Text>
        <Badge color={status.color} variant="light">
          {status.label}
        </Badge>
      </Group>

      <Stack gap="xs" mt="md">
        <Group gap="xs">
          <IconCalendarEvent size={16} color="gray" />
          <Text size="sm" c="dimmed">
            {scheduledDate
              ? scheduledDate.format("MMMM D, YYYY [at] h:mm A")
              : "Not scheduled"}
          </Text>
        </Group>
        <Group gap="xs">
          <IconClock size={16} color="gray" />
          <Text size="sm" c="dimmed">
            Duration: {assessment.duration} minutes
          </Text>
        </Group>
      </Stack>

      <Button
        fullWidth
        mt="lg"
        radius="md"
        variant={status.label === "In Progress" ? "filled" : "light"}
        color={status.label === "In Progress" ? "cyan" : "blue"}
        disabled={!isAccessible || status.label === "Completed"}
        onClick={handleStart}
        rightSection={<IconChevronRight size={16} />}
      >
        {status.label === "In Progress"
          ? "Continue Assessment"
          : status.label === "Completed"
            ? "View Results"
            : status.label === "Upcoming"
              ? "Start When Available"
              : "Not Available"}
      </Button>
    </Card>
  );
}

function UpcomingAssessments() {
  const { data: auth } = useAccessToken();
  const email = auth.payload.email;
  const { data: assessments, isLoading, error } = useStudentAssessments(email);

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Upcoming Assessments
        </Title>
        <Stack>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={120} radius="md" />
          ))}
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card withBorder radius="md" p="lg">
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconAlertCircle size={48} color="red" />
            <Text c="red">Failed to load assessments</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  const upcomingAssessments =
    assessments?.filter((inv) => {
      const assessment = inv.assessments as unknown as {
        archived_at: string | null;
        date_time_scheduled: string | null;
        duration: string;
      };
      const status = getAssessmentStatus(assessment);
      return status.label === "Upcoming" || status.label === "In Progress";
    }) ?? [];

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Upcoming Assessments</Title>
        <Badge variant="light" color="blue">
          {upcomingAssessments.length} upcoming
        </Badge>
      </Group>

      {upcomingAssessments.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
              <IconCalendarEvent size={32} />
            </ThemeIcon>
            <Text c="dimmed" ta="center">
              No upcoming assessments
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              You'll see your scheduled assessments here
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="md">
          {upcomingAssessments.map((inv) => (
            <UpcomingAssessmentCard
              key={inv.id}
              assessment={
                inv.assessments as unknown as {
                  id: string;
                  name: string;
                  duration: string;
                  date_time_scheduled: string | null;
                  archived_at: string | null;
                }
              }
              invitation={{ active: inv.active }}
            />
          ))}
        </Stack>
      )}
    </Card>
  );
}

function RecentActivity() {
  const { data: auth } = useAccessToken();
  const userId = auth.payload.user_metadata.user_id;
  const { data: submissions, isLoading } = useStudentSubmissions(userId);

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Recent Activity
        </Title>
        <Stack>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={60} radius="md" />
          ))}
        </Stack>
      </Card>
    );
  }

  const hasSubmissions = submissions && submissions.length > 0;

  return (
    <Card withBorder radius="md" p="lg" h="100%">
      <Title order={4} mb="md">
        Recent Activity
      </Title>

      {!hasSubmissions ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <ThemeIcon size={48} radius="xl" color="gray" variant="light">
              <IconFileCheck size={24} />
            </ThemeIcon>
            <Text c="dimmed" size="sm">
              No recent submissions
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="sm">
          {submissions.map((sa) => {
            const assessment = sa.assessments as {
              id: string;
              name: string;
            } | null;
            const submissionList = sa.submissions as {
              id: string;
              created_at: string;
              submission_details: { grade: string }[];
            }[];
            const latestSubmission = submissionList[0];
            const grade = latestSubmission.submission_details[0]?.grade;

            return (
              <Paper key={sa.id} p="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Box>
                    <Text size="sm" fw={500}>
                      {assessment?.name ?? "Unknown Assessment"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {dayjs(sa.created_at).format("MMM D, YYYY")}
                    </Text>
                  </Box>
                  {grade && (
                    <Badge
                      color={grade === "pass" ? "green" : "red"}
                      variant="light"
                    >
                      {grade === "pass" ? "Passed" : "Failed"}
                    </Badge>
                  )}
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}

function QuickStats() {
  const { data: auth } = useAccessToken();
  const email = auth.payload.email;
  const { data: assessments } = useStudentAssessments(email);

  const stats = {
    total: assessments?.length ?? 0,
    upcoming: 0,
    completed: 0,
  };

  assessments?.forEach((inv) => {
    const assessment = inv.assessments as unknown as {
      archived_at: string | null;
      date_time_scheduled: string | null;
      duration: string;
    };

    const status = getAssessmentStatus(assessment);
    if (status.label === "Upcoming" || status.label === "In Progress") {
      stats.upcoming++;
    } else if (status.label === "Completed") {
      stats.completed++;
    }
  });

  return (
    <Card withBorder radius="md" p="lg" h="100%">
      <Title order={4} mb="md">
        Your Progress
      </Title>

      <Center>
        <RingProgress
          size={160}
          thickness={16}
          roundCaps
          sections={[
            {
              value:
                stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
              color: "green",
            },
            {
              value: stats.total > 0 ? (stats.upcoming / stats.total) * 100 : 0,
              color: "blue",
            },
          ]}
          label={
            <Center>
              <Stack gap={0} align="center">
                <Text size="xl" fw={700}>
                  {stats.completed}
                </Text>
                <Text size="xs" c="dimmed">
                  completed
                </Text>
              </Stack>
            </Center>
          }
        />
      </Center>

      <Stack gap="xs" mt="lg">
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={12} h={12} bg="green" style={{ borderRadius: "50%" }} />
            <Text size="sm">Completed</Text>
          </Group>
          <Text size="sm" fw={600}>
            {stats.completed}
          </Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Box w={12} h={12} bg="blue" style={{ borderRadius: "50%" }} />
            <Text size="sm">Upcoming</Text>
          </Group>
          <Text size="sm" fw={600}>
            {stats.upcoming}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

function StudentDashboardContent() {
  const { data: auth } = useAccessToken();
  const email = auth.payload.email;
  const { data: assessments } = useStudentAssessments(email);

  const stats = {
    total: assessments?.length ?? 0,
    upcoming: 0,
    completed: 0,
  };

  assessments?.forEach((inv) => {
    const assessment = inv.assessments as unknown as {
      archived_at: string | null;
      date_time_scheduled: string | null;
      duration: string;
    };

    const status = getAssessmentStatus(assessment);
    if (status.label === "Upcoming" || status.label === "In Progress") {
      stats.upcoming++;
    } else if (status.label === "Completed") {
      stats.completed++;
    }
  });

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <WelcomeCard name={email.split("@")[0]} email={email} />

        <StatsCards
          totalAssessments={stats.total}
          upcomingCount={stats.upcoming}
          completedCount={stats.completed}
        />

        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <UpcomingAssessments />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <QuickStats />
              <RecentActivity />
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

function RouteComponent() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}

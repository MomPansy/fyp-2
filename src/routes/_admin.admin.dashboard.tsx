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
  Paper,
  ThemeIcon,
  Box,
  Button,
  Skeleton,
  Center,
  Table,
  ActionIcon,
  Tooltip,
  RingProgress,
  SimpleGrid,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconFileCheck,
  IconChevronRight,
  IconUsers,
  IconClipboardList,
  IconPlus,
  IconEdit,
  IconAlertTriangle,
  IconCircleCheck,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { Suspense, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase.ts";
import { useAccessToken, useUser } from "@/hooks/auth.ts";
import { dayjs } from "@/lib/dayjs.ts";
import { useCreateAssessmentMutation } from "@/components/assessments/hooks.ts";
import { generateUUID } from "@/lib/utils.ts";

export const Route = createFileRoute("/_admin/admin/dashboard")({
  component: RouteComponent,
});

// Query to fetch admin's assessments
const useAdminAssessments = (userId: string) => {
  return useQuery({
    queryKey: ["admin-dashboard-assessments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select(
          `
          id,
          name,
          duration,
          date_time_scheduled,
          archived_at,
          created_at,
          assessment_problems (
            id
          ),
          assessment_student_invitations (
            id,
            active
          )
        `,
        )
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });
};

// Query to fetch overall stats
const useAdminStats = (userId: string) => {
  return useQuery({
    queryKey: ["admin-dashboard-stats", userId],
    queryFn: async () => {
      // Total assessments
      const { count: totalAssessments, error: assessmentError } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null);

      if (assessmentError) throw new Error(assessmentError.message);

      // Total problems created
      const { count: totalProblems, error: problemsError } = await supabase
        .from("user_problems")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null);

      if (problemsError) throw new Error(problemsError.message);

      // Total invitations sent
      const { data: assessmentIds, error: idsError } = await supabase
        .from("assessments")
        .select("id")
        .eq("user_id", userId);

      if (idsError) throw new Error(idsError.message);

      let totalInvitations = 0;
      let activeStudents = 0;

      if (assessmentIds.length > 0) {
        const ids = assessmentIds.map((a) => a.id);

        const { count: invCount, error: invError } = await supabase
          .from("assessment_student_invitations")
          .select("*", { count: "exact", head: true })
          .in("assessment_id", ids);

        if (invError) throw new Error(invError.message);
        totalInvitations = invCount ?? 0;

        const { count: activeCount, error: activeError } = await supabase
          .from("assessment_student_invitations")
          .select("*", { count: "exact", head: true })
          .in("assessment_id", ids)
          .eq("active", true);

        if (activeError) throw new Error(activeError.message);
        activeStudents = activeCount ?? 0;
      }

      return {
        totalAssessments: totalAssessments ?? 0,
        totalProblems: totalProblems ?? 0,
        totalInvitations,
        activeStudents,
      };
    },
    enabled: !!userId,
  });
};

function getAssessmentStatus(assessment: {
  archived_at: string | null;
  date_time_scheduled: string | null;
  duration: number | string;
}) {
  if (assessment.archived_at) {
    return { label: "Cancelled", color: "red", icon: IconAlertTriangle };
  }

  if (!assessment.date_time_scheduled) {
    return { label: "Draft", color: "gray", icon: IconEdit };
  }

  const now = dayjs();
  const scheduledDate = dayjs(assessment.date_time_scheduled);
  const duration =
    typeof assessment.duration === "string"
      ? parseInt(assessment.duration)
      : assessment.duration;
  const scheduledEndTime = scheduledDate.add(duration, "minutes");

  if (now.isBefore(scheduledDate)) {
    return { label: "Scheduled", color: "blue", icon: IconCalendarEvent };
  }

  if (now.isAfter(scheduledDate) && now.isBefore(scheduledEndTime)) {
    return { label: "In Progress", color: "cyan", icon: IconPlayerPlay };
  }

  if (now.isAfter(scheduledEndTime)) {
    return { label: "Completed", color: "green", icon: IconCircleCheck };
  }

  return { label: "Active", color: "green", icon: IconCircleCheck };
}

function DashboardSkeleton() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Skeleton height={100} radius="md" />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={100} radius="md" />
          ))}
        </SimpleGrid>
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

function WelcomeHeader({ name, email }: { name: string; email: string }) {
  const navigate = useNavigate();
  const { mutate } = useCreateAssessmentMutation();
  const { user_id } = useUser();
  const createProblemId = useCallback(() => generateUUID(), []);

  const handleCreateAssessment = () => {
    const newAssessment = {
      id: createProblemId(),
      name: "Untitled Assessment",
      duration: 60,
      user_id: user_id,
    };
    mutate(newAssessment, {
      onSuccess: (data) => {
        navigate({
          to: "/admin/assessment/$id/details",
          params: { id: data.id },
        });
      },
    });
  };

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
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
        color: "white",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Box>
          <Text size="lg" fw={500} opacity={0.9}>
            {greeting},
          </Text>
          <Title order={2} fw={700} mt={4}>
            {name || email.split("@")[0]}
          </Title>
          <Text size="sm" opacity={0.8} mt="xs">
            Manage your assessments and track student progress
          </Text>
        </Box>
        <Group>
          <Button
            variant="white"
            color="dark"
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateAssessment}
          >
            Create Assessment
          </Button>
          <Button
            variant="light"
            color="white"
            onClick={() => navigate({ to: "/admin/problems" })}
          >
            Manage Problems
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

function StatsOverview({ userId }: { userId: string }) {
  const { data: stats, isLoading } = useAdminStats(userId);

  const statCards = [
    {
      title: "Total Assessments",
      value: stats?.totalAssessments ?? 0,
      icon: IconClipboardList,
      color: "blue",
      description: "Active assessments",
    },
    {
      title: "Problems Created",
      value: stats?.totalProblems ?? 0,
      icon: IconFileCheck,
      color: "violet",
      description: "SQL problems",
    },
    {
      title: "Students Invited",
      value: stats?.totalInvitations ?? 0,
      icon: IconUsers,
      color: "orange",
      description: "Total invitations",
    },
  ];

  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={110} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {statCards.map((stat) => (
        <Paper key={stat.title} p="md" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                {stat.title}
              </Text>
              <Title order={2} mt={4}>
                {stat.value}
              </Title>
              <Text size="xs" c="dimmed" mt={4}>
                {stat.description}
              </Text>
            </Box>
            <ThemeIcon size={48} radius="md" color={stat.color} variant="light">
              <stat.icon size={24} />
            </ThemeIcon>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

function RecentAssessments({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { data: assessments, isLoading } = useAdminAssessments(userId);

  if (isLoading) {
    return (
      <Card withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Recent Assessments
        </Title>
        <Stack>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={60} radius="md" />
          ))}
        </Stack>
      </Card>
    );
  }

  const handleViewAssessment = (id: string) => {
    navigate({
      to: "/admin/assessment/$id/details",
      params: { id },
    });
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Recent Assessments</Title>
        <Button
          variant="subtle"
          size="xs"
          rightSection={<IconChevronRight size={14} />}
          onClick={() => navigate({ to: "/admin/assessments" })}
        >
          View All
        </Button>
      </Group>

      {!assessments || assessments.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
              <IconClipboardList size={32} />
            </ThemeIcon>
            <Text c="dimmed" ta="center">
              No assessments yet
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Create your first assessment to get started
            </Text>
          </Stack>
        </Center>
      ) : (
        <Table.ScrollContainer minWidth={500}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Assessment</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Problems</Table.Th>
                <Table.Th>Students</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {assessments.map((assessment) => {
                const status = getAssessmentStatus({
                  archived_at: assessment.archived_at,
                  date_time_scheduled: assessment.date_time_scheduled,
                  duration: assessment.duration,
                });

                const problems = assessment.assessment_problems as {
                  id: string;
                }[];
                const invitations =
                  assessment.assessment_student_invitations as {
                    id: string;
                    active: boolean;
                  }[];

                const activeCount = invitations.filter(
                  (inv) => inv.active,
                ).length;
                const totalCount = invitations.length;

                return (
                  <Table.Tr
                    key={assessment.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleViewAssessment(assessment.id)}
                  >
                    <Table.Td>
                      <Group gap="sm">
                        <ThemeIcon
                          size={32}
                          radius="md"
                          color={status.color}
                          variant="light"
                        >
                          <status.icon size={16} />
                        </ThemeIcon>
                        <Box>
                          <Text size="sm" fw={500}>
                            {assessment.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {assessment.duration} min
                          </Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={status.color} variant="light" size="sm">
                        {status.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{problems.length}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Text size="sm">{activeCount}</Text>
                        <Text size="xs" c="dimmed">
                          / {totalCount}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {assessment.date_time_scheduled
                          ? dayjs(assessment.date_time_scheduled).format(
                            "MMM D, YYYY",
                          )
                          : "Not scheduled"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Edit Assessment">
                        <ActionIcon
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAssessment(assessment.id);
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}

function AssessmentStatusOverview({ userId }: { userId: string }) {
  const { data: assessments } = useAdminAssessments(userId);

  const statusCounts = {
    draft: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
  };

  assessments?.forEach((assessment) => {
    const status = getAssessmentStatus({
      archived_at: assessment.archived_at,
      date_time_scheduled: assessment.date_time_scheduled,
      duration: assessment.duration,
    });

    switch (status.label) {
      case "Draft":
        statusCounts.draft++;
        break;
      case "Scheduled":
        statusCounts.scheduled++;
        break;
      case "In Progress":
        statusCounts.inProgress++;
        break;
      case "Completed":
        statusCounts.completed++;
        break;
    }
  });

  const total =
    statusCounts.draft +
    statusCounts.scheduled +
    statusCounts.inProgress +
    statusCounts.completed;

  return (
    <Card withBorder radius="md" p="lg" h="100%">
      <Title order={4} mb="md">
        Assessment Status
      </Title>

      <Center mb="md">
        <RingProgress
          size={180}
          thickness={20}
          roundCaps
          sections={[
            {
              value: total > 0 ? (statusCounts.completed / total) * 100 : 0,
              color: "green",
              tooltip: `Completed: ${statusCounts.completed}`,
            },
            {
              value: total > 0 ? (statusCounts.inProgress / total) * 100 : 0,
              color: "cyan",
              tooltip: `In Progress: ${statusCounts.inProgress}`,
            },
            {
              value: total > 0 ? (statusCounts.scheduled / total) * 100 : 0,
              color: "blue",
              tooltip: `Scheduled: ${statusCounts.scheduled}`,
            },
            {
              value: total > 0 ? (statusCounts.draft / total) * 100 : 0,
              color: "gray",
              tooltip: `Draft: ${statusCounts.draft}`,
            },
          ]}
          label={
            <Center>
              <Stack gap={0} align="center">
                <Text size="xl" fw={700}>
                  {total}
                </Text>
                <Text size="xs" c="dimmed">
                  total
                </Text>
              </Stack>
            </Center>
          }
        />
      </Center>

      <Stack gap="sm">
        {[
          { label: "Completed", color: "green", count: statusCounts.completed },
          {
            label: "In Progress",
            color: "cyan",
            count: statusCounts.inProgress,
          },
          { label: "Scheduled", color: "blue", count: statusCounts.scheduled },
          { label: "Draft", color: "gray", count: statusCounts.draft },
        ].map((item) => (
          <Group key={item.label} justify="space-between">
            <Group gap="xs">
              <Box
                w={12}
                h={12}
                bg={item.color}
                style={{ borderRadius: "50%" }}
              />
              <Text size="sm">{item.label}</Text>
            </Group>
            <Text size="sm" fw={600}>
              {item.count}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function AdminDashboardContent() {
  const { data: auth } = useAccessToken();
  const email = auth.payload.email;
  const userId = auth.payload.user_metadata.user_id;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <WelcomeHeader name={email.split("@")[0]} email={email} />

        <StatsOverview userId={userId} />

        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <RecentAssessments userId={userId} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <AssessmentStatusOverview userId={userId} />
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
      <AdminDashboardContent />
    </Suspense>
  );
}

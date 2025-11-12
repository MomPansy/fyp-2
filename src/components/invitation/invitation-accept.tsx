import {
  Button,
  Paper,
  Text,
  Title,
  Container,
  Stack,
  LoadingOverlay,
  Group,
  ThemeIcon,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  IconCalendar,
  IconMail,
  IconUser,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { api } from "lib/api.ts";
import { showError } from "utils/notifications.tsx";

export function InvitationAccept() {
  const { token } = useParams({ from: "/invitation/$token" });
  const navigate = useNavigate();

  // Fetch invitation details
  const {
    data: invitationData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      const response = await api.invitations[":token"].$get({
        param: { token },
      });
      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message ?? "Failed to fetch invitation");
      }
      return response.json();
    },
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationKey: ["invitation", "accept", token],
    mutationFn: async () => {
      const response = await api.invitations[":token"].accept.$post({
        param: { token },
      });
      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message ?? "Failed to accept invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      notifications.show({
        title: "Invitation Accepted!",
        message: data.accountExists
          ? "Welcome back! Redirecting to your assessment..."
          : "Account created successfully! Redirecting to your assessment...",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Redirect to assessment page
      setTimeout(() => {
        navigate({ to: `/student/assessment/${data.assessmentId}` });
      }, 1500);
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  if (isLoading) {
    return (
      <Container size="sm" py={80}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <LoadingOverlay visible />
          <Text ta="center" c="dimmed">
            Loading invitation details...
          </Text>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py={80}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            variant="filled"
          >
            {error.message || "Failed to load invitation"}
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (!invitationData?.invitation) {
    return (
      <Container size="sm" py={80}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Invalid Invitation"
            color="red"
            variant="filled"
          >
            This invitation link is invalid or has expired.
          </Alert>
        </Paper>
      </Container>
    );
  }

  const { invitation } = invitationData;

  return (
    <Container size="sm" py={80}>
      <Paper shadow="md" p={30} radius="md" withBorder pos="relative">
        <LoadingOverlay visible={acceptMutation.isPending} />

        <Title order={2} ta="center" mb="md">
          Assessment Invitation
        </Title>

        <Text ta="center" c="dimmed" size="sm" mb="xl">
          You've been invited to participate in an assessment
        </Text>

        <Stack gap="xl">
          {/* Assessment Title */}
          <Paper p="md" withBorder>
            <Title order={3} size="h4" mb="sm">
              {invitation.assessmentTitle}
            </Title>
            {invitation.assessmentDate && (
              <Group gap="xs">
                <ThemeIcon variant="light" size="sm">
                  <IconCalendar size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {new Date(invitation.assessmentDate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </Text>
              </Group>
            )}
          </Paper>

          {/* Student Information */}
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" size="md">
                <IconUser size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Full Name
                </Text>
                <Text fw={500}>{invitation.fullName}</Text>
              </div>
            </Group>

            <Group gap="xs">
              <ThemeIcon variant="light" size="md">
                <IconMail size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Email
                </Text>
                <Text fw={500}>{invitation.email}</Text>
              </div>
            </Group>

            {invitation.matriculationNumber && (
              <Group gap="xs">
                <ThemeIcon variant="light" size="md">
                  <IconUser size={16} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">
                    Matriculation Number
                  </Text>
                  <Text fw={500}>{invitation.matriculationNumber}</Text>
                </div>
              </Group>
            )}
          </Stack>

          {/* Accept Button */}
          <Button
            size="lg"
            fullWidth
            onClick={() => acceptMutation.mutate()}
            loading={acceptMutation.isPending}
          >
            Accept Invitation & Continue
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            By accepting, an account will be created for you and you'll be
            redirected to the assessment.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}

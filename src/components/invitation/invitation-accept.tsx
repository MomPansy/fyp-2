import { useState } from "react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  IconCalendar,
  IconMail,
  IconUser,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { showSuccessNotification } from "../notifications.ts";
import { api } from "lib/api.ts";
import { showError, showSuccess } from "utils/notifications.tsx";
import { useSendOtp, useVerifyOtp } from "hooks/useOtp.ts";
import { OtpVerification } from "components/auth/OtpVerification.tsx";
import { AssessmentEnded } from "components/student-assessments/assessment-display.tsx";
import { dayjs } from "lib/dayjs.ts";

export function InvitationAccept() {
  const { token } = useParams({ from: "/invitation/$token" });
  const navigate = useNavigate();
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

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

      // Handle different status codes
      if (response.status === 410) {
        // Assessment has ended
        const data = (await response.json()) as {
          success: false;
          error: string;
          message: string;
          assessmentTitle: string;
          assessmentDate: string | null;
          assessmentEndDate?: string;
        };
        return {
          ...data,
          success: false,
          error: "assessment_ended" as const,
        };
      }

      if (response.status === 400) {
        // Token expired or other client error
        const data = (await response.json()) as {
          success: false;
          error?: string;
          message: string;
          assessmentTitle?: string;
          assessmentId?: string;
        };
        const errorType = data.error ?? "bad_request";
        return {
          ...data,
          success: false,
          error: errorType,
        };
      }

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      return response.json();
    },
    retry: false,
  });

  // Send OTP mutation
  const sendOtpMutation = useSendOtp();

  // Verify OTP mutation
  const verifyOtpMutation = useVerifyOtp();

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationKey: ["invitation", "accept", token],
    mutationFn: async () => {
      const response = await api.invitations[":token"].accept.$get({
        param: { token },
      });
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: (data) => {
      showSuccessNotification({
        title: "Invitation Accepted!",
        message: data.accountExists
          ? "Welcome back! Sending OTP to your email..."
          : "Account created successfully! Sending OTP to your email...",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      // Store assessment ID for later use
      setAssessmentId(data.assessmentId);

      // Store user email and send OTP
      // Only access invitation data if it's a successful response
      if (invitationData && "invitation" in invitationData) {
        const email = invitationData.invitation.email;
        if (email) {
          setUserEmail(email);
          sendOtpMutation.mutate(email, {
            onSuccess: () => {
              setShowOtpInput(true);
            },
          });
        } else {
          showError("Could not send OTP: email not found");
        }
      } else {
        showError("Could not send OTP: invitation data not available");
      }
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

  // Handle assessment ended
  if (
    invitationData &&
    "error" in invitationData &&
    invitationData.error === "assessment_ended"
  ) {
    const assessmentTitle =
      "assessmentTitle" in invitationData
        ? (invitationData.assessmentTitle ?? "")
        : "";
    const assessmentDate =
      "assessmentDate" in invitationData && invitationData.assessmentDate
        ? invitationData.assessmentDate
        : "";
    const assessmentEndDate =
      "assessmentEndDate" in invitationData && invitationData.assessmentEndDate
        ? invitationData.assessmentEndDate
        : "";

    return (
      <Container size="sm" py={80}>
        <AssessmentEnded
          data={{
            status: "ended",
            assessmentName: assessmentTitle,
            scheduledDate: assessmentDate,
            endDate: assessmentEndDate,
          }}
        />
      </Container>
    );
  }

  // Handle expired token (but assessment still active)
  if (
    invitationData &&
    "error" in invitationData &&
    (invitationData.error === "token_expired" ||
      invitationData.error === "invitation_not_active")
  ) {
    return (
      <Container size="sm" py={80}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <Stack gap="md" align="center">
            <ThemeIcon size={64} radius="md" color="yellow" variant="light">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Title order={2} ta="center">
              {invitationData.error === "token_expired"
                ? "Invitation Link Expired"
                : "Invitation No Longer Active"}
            </Title>
            <Text ta="center" c="dimmed">
              {"assessmentTitle" in invitationData &&
                invitationData.assessmentTitle}
            </Text>
            <Alert color="yellow" variant="light" w="100%">
              <Text size="sm">
                {"message" in invitationData && invitationData.message}
              </Text>
            </Alert>
            <Button
              fullWidth
              onClick={() => navigate({ to: "/login" })}
              leftSection={<IconMail size={16} />}
            >
              Sign In
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!invitationData || !("invitation" in invitationData)) {
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
        <LoadingOverlay
          visible={acceptMutation.isPending || sendOtpMutation.isPending}
        />

        <Title order={2} ta="center" mb="md">
          {showOtpInput ? "Verify Your Email" : "Assessment Invitation"}
        </Title>

        <Text ta="center" c="dimmed" size="sm" mb="xl">
          {showOtpInput
            ? "Enter the OTP we sent to your email"
            : "You've been invited to participate in an assessment"}
        </Text>

        {showOtpInput ? (
          <OtpVerification
            email={userEmail}
            onComplete={(token) => {
              verifyOtpMutation.mutate(
                {
                  email: userEmail,
                  token,
                  processInvitation: true,
                },
                {
                  onSuccess: () => {
                    showSuccess("OTP verified! Redirecting to assessment...");

                    // Redirect to assessment page
                    if (assessmentId) {
                      setTimeout(() => {
                        navigate({
                          to: "/student/assessment/$id",
                          params: { id: assessmentId },
                        });
                      }, 1500);
                    }
                  },
                },
              );
            }}
            isLoading={verifyOtpMutation.isPending}
          />
        ) : (
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
                    {dayjs(invitation.assessmentDate).format(
                      "MMMM D, YYYY [at] h:mm A",
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
        )}
      </Paper>
    </Container>
  );
}

import {
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Modal,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useParams } from "@tanstack/react-router";
import {
  IconCalendar,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
  IconX,
  IconRestore,
} from "@tabler/icons-react";
import { z } from "zod";
import { zodResolver } from "mantine-form-zod-resolver";
import { useState } from "react";
import {
  useFetchAssessmentById,
  useUpdateAssessmentSettingsMutation,
  useUpdateAssessmentNameMutation,
  useCancelAssessmentMutation,
  useRestoreAssessmentMutation,
} from "../hooks.ts";
import { dayjs } from "@/lib/dayjs.ts";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/notifications.ts";

const settingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Assessment name is required" })
    .max(255, { message: "Assessment name cannot exceed 255 characters" })
    .refine((val) => val.trim().length > 0, {
      message: "Assessment name cannot be empty",
    }),
  dateTimeScheduled: z
    .string()
    .nullable()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        return dayjs(date).isAfter(dayjs());
      },
      { message: "Scheduled date must be in the future" },
    ),
  duration: z
    .number()
    .min(1, { message: "Duration must be greater than 0" })
    .max(480, { message: "Duration cannot exceed 8 hours (480 minutes)" }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsTab() {
  const { id } = useParams({ from: "/_admin/admin/assessment/$id/details" });
  const { data } = useFetchAssessmentById(id);
  const updateSettingsMutation = useUpdateAssessmentSettingsMutation();
  const updateNameMutation = useUpdateAssessmentNameMutation();
  const cancelAssessmentMutation = useCancelAssessmentMutation();
  const restoreAssessmentMutation = useRestoreAssessmentMutation();
  const [cancelModalOpened, setCancelModalOpened] = useState(false);

  const isCancelled = !!data?.archived_at;

  const form = useForm<SettingsFormValues>({
    mode: "uncontrolled",
    initialValues: {
      name: data?.name ?? "",
      dateTimeScheduled: data?.date_time_scheduled,
      duration: data?.duration ?? 60,
    },
    validate: zodResolver(settingsSchema),
  });

  const handleSubmit = async (values: SettingsFormValues) => {
    try {
      // Check if name has changed
      const nameChanged = data?.name !== values.name;

      // Update name if changed
      if (nameChanged) {
        await updateNameMutation.mutateAsync({
          id,
          name: values.name,
        });
      }

      // Convert local datetime to UTC for storage
      const dateTimeScheduledUTC = values.dateTimeScheduled
        ? dayjs(values.dateTimeScheduled).utc().format()
        : null;

      // Update settings (date and duration)
      await updateSettingsMutation.mutateAsync({
        id,
        dateTimeScheduled: dateTimeScheduledUTC,
        duration: values.duration,
      });

      showSuccessNotification({
        title: "Success",
        message: "Assessment settings updated successfully",
        color: "green",
      });
    } catch (error) {
      showErrorNotification({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update assessment settings",
        color: "red",
      });
    }
  };

  const handleCancelAssessment = () => {
    cancelAssessmentMutation.mutate(
      { id },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: "Assessment Cancelled",
            message: "The assessment has been cancelled successfully",
            color: "orange",
          });
          setCancelModalOpened(false);
        },
      },
    );
  };

  const handleRestoreAssessment = () => {
    restoreAssessmentMutation.mutate(
      { id },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: "Assessment Restored",
            message: "The assessment has been restored successfully",
            color: "green",
          });
        },
      },
    );
  };

  return (
    <>
      <Group>
        <Paper withBorder p="xl" radius="md" w="67%" m="auto">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="xl">
              <Group justify="space-between" align="center">
                <Text size="xl" fw="bold">
                  Assessment Settings
                </Text>
                {isCancelled ? (
                  <Button
                    color="green"
                    leftSection={<IconRestore size={18} />}
                    onClick={handleRestoreAssessment}
                    loading={restoreAssessmentMutation.isPending}
                  >
                    Restore Assessment
                  </Button>
                ) : (
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconX size={18} />}
                    onClick={() => setCancelModalOpened(true)}
                  >
                    Cancel Assessment
                  </Button>
                )}
              </Group>

              {isCancelled && (
                <Text size="sm" c="dimmed">
                  This assessment has been cancelled. Restore it to make changes
                  or allow candidates to take it.
                </Text>
              )}

              <TextInput
                label="Assessment Name"
                description="Give your assessment a descriptive name"
                placeholder="Enter assessment name"
                leftSection={<IconEdit size={18} />}
                required
                disabled={isCancelled}
                {...form.getInputProps("name")}
              />

              <DateTimePicker
                label="Scheduled Date & Time"
                description="When should this assessment be available to candidates?"
                placeholder="Pick date and time"
                leftSection={<IconCalendar size={18} />}
                clearable
                minDate={new Date()}
                disabled={isCancelled}
                timePickerProps={{
                  withDropdown: true,
                  popoverProps: { withinPortal: false },
                  format: "12h",
                }}
                valueFormat="DD MMM YYYY hh:mm A"
                {...form.getInputProps("dateTimeScheduled")}
              />

              <NumberInput
                label="Duration (minutes)"
                description="How long should candidates have to complete this assessment?"
                placeholder="Enter duration in minutes"
                leftSection={<IconClock size={18} />}
                min={1}
                max={480}
                step={5}
                disabled={isCancelled}
                {...form.getInputProps("duration")}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  type="button"
                  variant="subtle"
                  onClick={() => form.reset()}
                  disabled={
                    isCancelled ||
                    updateSettingsMutation.isPending ||
                    updateNameMutation.isPending
                  }
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  leftSection={<IconDeviceFloppy size={18} />}
                  disabled={isCancelled}
                  loading={
                    updateSettingsMutation.isPending ||
                    updateNameMutation.isPending
                  }
                >
                  Save Settings
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Group>

      <Modal
        opened={cancelModalOpened}
        onClose={() => setCancelModalOpened(false)}
        title="Cancel Assessment"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to cancel this assessment? Candidates will no
            longer be able to access it. You can restore it later if needed.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setCancelModalOpened(false)}
            >
              Keep Assessment
            </Button>
            <Button
              color="red"
              leftSection={<IconX size={18} />}
              onClick={handleCancelAssessment}
              loading={cancelAssessmentMutation.isPending}
            >
              Cancel Assessment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

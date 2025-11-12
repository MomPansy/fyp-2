import { Button, Group, NumberInput, Paper, Stack, Text } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useParams } from "@tanstack/react-router";
import { IconCalendar, IconClock, IconDeviceFloppy } from "@tabler/icons-react";
import {
  useFetchAssessmentById,
  useUpdateAssessmentSettingsMutation,
} from "../hooks.ts";

interface SettingsFormValues {
  dateTimeScheduled: Date | null;
  duration: number;
}

export function SettingsTab() {
  const { id } = useParams({ from: "/_admin/admin/assessment/$id/details" });
  const { data } = useFetchAssessmentById(id);
  const updateMutation = useUpdateAssessmentSettingsMutation();

  const form = useForm<SettingsFormValues>({
    initialValues: {
      dateTimeScheduled: data?.date_time_scheduled
        ? new Date(data.date_time_scheduled)
        : null,
      duration: data?.duration ? Number(data.duration) : 60,
    },
    validate: {
      duration: (value) => {
        if (!value || value <= 0) {
          return "Duration must be greater than 0";
        }
        if (value > 480) {
          return "Duration cannot exceed 8 hours (480 minutes)";
        }
        return null;
      },
      dateTimeScheduled: (value) => {
        if (value && value < new Date()) {
          return "Scheduled date must be in the future";
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: SettingsFormValues) => {
    try {
      // Ensure dateTimeScheduled is a Date object or null
      const dateValue = values.dateTimeScheduled
        ? values.dateTimeScheduled instanceof Date
          ? values.dateTimeScheduled.toISOString()
          : new Date(values.dateTimeScheduled).toISOString()
        : null;

      await updateMutation.mutateAsync({
        id,
        dateTimeScheduled: dateValue,
        duration: values.duration.toString(),
      });

      notifications.show({
        title: "Success",
        message: "Assessment settings updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update assessment settings",
        color: "red",
      });
    }
  };

  return (
    <Group>
      <Paper withBorder p="xl" radius="md" w="67%" m="auto">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="xl">
            <Text size="xl" fw="bold">
              Assessment Settings
            </Text>

            <DateTimePicker
              label="Scheduled Date & Time"
              description="When should this assessment be available to candidates?"
              placeholder="Pick date and time"
              leftSection={<IconCalendar size={18} />}
              clearable
              minDate={new Date()}
              timePickerProps={{
                withDropdown: true,
                popoverProps: { withinPortal: false },
                format: "12h",
              }}
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
              {...form.getInputProps("duration")}
            />

            <Group justify="flex-end" mt="md">
              <Button
                type="button"
                variant="subtle"
                onClick={() => form.reset()}
                disabled={updateMutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={18} />}
                loading={updateMutation.isPending}
              >
                Save Settings
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Group>
  );
}

import {
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useParams } from "@tanstack/react-router";
import {
  IconCalendar,
  IconClock,
  IconDeviceFloppy,
  IconEdit,
} from "@tabler/icons-react";
import { z } from "zod";
import { zodResolver } from "mantine-form-zod-resolver";
import {
  useFetchAssessmentById,
  useUpdateAssessmentSettingsMutation,
  useUpdateAssessmentNameMutation,
} from "../hooks.ts";

const settingsSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Assessment name is required" })
    .max(255, { message: "Assessment name cannot exceed 255 characters" })
    .refine((val) => val.trim().length > 0, {
      message: "Assessment name cannot be empty",
    }),
  dateTimeScheduled: z
    .union([z.date(), z.string()])
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      return typeof val === "string" ? new Date(val) : val;
    })
    .refine(
      (date) => {
        if (!date) return true;
        return date >= new Date();
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

  const form = useForm<SettingsFormValues>({
    mode: "uncontrolled",
    initialValues: {
      name: data?.name ?? "",
      dateTimeScheduled: data?.date_time_scheduled
        ? new Date(data.date_time_scheduled)
        : null,
      duration: data?.duration ? Number(data.duration) : 60,
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

      // Update settings (date and duration)
      await updateSettingsMutation.mutateAsync({
        id,
        dateTimeScheduled: values.dateTimeScheduled
          ? new Date(values.dateTimeScheduled).toISOString()
          : null,
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

            <TextInput
              label="Assessment Name"
              description="Give your assessment a descriptive name"
              placeholder="Enter assessment name"
              leftSection={<IconEdit size={18} />}
              required
              {...form.getInputProps("name")}
            />

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
                disabled={
                  updateSettingsMutation.isPending ||
                  updateNameMutation.isPending
                }
              >
                Reset
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={18} />}
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
  );
}

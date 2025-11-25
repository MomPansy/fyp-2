import { dayjs } from "@/lib/dayjs.ts";

export interface AssessmentStatusParams {
  archived_at: string | null;
  date_time_scheduled: string | null;
  duration: number;
}

export interface AssessmentStatus {
  label: string;
  color: string;
}

/**
 * Determines the status of an assessment based on its scheduling and completion state
 * @param assessment - Assessment object with archived_at, date_time_scheduled, and duration
 * @returns Status object with label and color for display
 */
export function getAssessmentStatus(
  assessment: AssessmentStatusParams,
): AssessmentStatus {
  // Check if cancelled first
  if (assessment.archived_at) {
    return { label: "Cancelled", color: "red" };
  }

  if (!assessment.date_time_scheduled) {
    return { label: "Draft", color: "gray" };
  }

  const now = dayjs();
  const scheduledDate = dayjs(assessment.date_time_scheduled);
  const duration = assessment.duration || 60;
  const scheduledEndTime = scheduledDate.add(duration, "minutes");

  if (now.isBefore(scheduledDate)) {
    return { label: "Scheduled", color: "blue" };
  }

  if (now.isAfter(scheduledDate) && now.isBefore(scheduledEndTime)) {
    return { label: "In Progress", color: "cyan" };
  }

  if (now.isAfter(scheduledEndTime) || now.isSame(scheduledEndTime)) {
    return { label: "Completed", color: "green" };
  }

  return { label: "Active", color: "green" };
}

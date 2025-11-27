/**
 * Shared utility functions for assessment timing calculations.
 * Used by both the assessment-status middleware and the invitations endpoint.
 */

export type AssessmentTimingStatus = "not_started" | "active" | "ended";

export interface AssessmentTiming {
  status: AssessmentTimingStatus;
  scheduledDate: Date | null;
  endDate: Date | null;
}

/**
 * Calculate the end date of an assessment based on its scheduled date and duration.
 *
 * @param scheduledDate - The scheduled start date of the assessment
 * @param durationMinutes - Duration of the assessment in minutes
 * @returns The calculated end date, or null if no scheduled date
 */
export function calculateAssessmentEndDate(
  scheduledDate: Date | string | null,
  durationMinutes: number | string,
): Date | null {
  if (!scheduledDate) return null;

  const scheduled =
    typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate;
  const duration =
    typeof durationMinutes === "string"
      ? Number(durationMinutes)
      : durationMinutes;

  return new Date(scheduled.getTime() + duration * 60 * 1000);
}

/**
 * Determine the timing status of an assessment based on the current time.
 *
 * @param scheduledDate - The scheduled start date of the assessment
 * @param durationMinutes - Duration of the assessment in minutes
 * @param now - Optional current date for testing (defaults to new Date())
 * @returns Assessment timing information including status and relevant dates
 */
export function getAssessmentTimingStatus(
  scheduledDate: Date | string | null,
  durationMinutes: number | string,
  now: Date = new Date(),
): AssessmentTiming {
  if (!scheduledDate) {
    // If no scheduled date, assessment is always available/active
    return {
      status: "active",
      scheduledDate: null,
      endDate: null,
    };
  }

  const scheduled =
    typeof scheduledDate === "string" ? new Date(scheduledDate) : scheduledDate;
  const endDate = calculateAssessmentEndDate(scheduled, durationMinutes);

  // Assessment has not started yet
  if (now < scheduled) {
    return {
      status: "not_started",
      scheduledDate: scheduled,
      endDate,
    };
  }

  // Assessment has ended
  if (endDate && now > endDate) {
    return {
      status: "ended",
      scheduledDate: scheduled,
      endDate,
    };
  }

  // Assessment is active
  return {
    status: "active",
    scheduledDate: scheduled,
    endDate,
  };
}

import type { Row } from "@/components/problems/database/table-manager/csv-import.store.ts";

export interface CandidateRow {
  email: string;
  full_name: string;
  matriculation_number: string;
  active?: boolean;
  [key: string]: unknown;
}

export type ValidationResult =
  | { valid: true; candidates: CandidateRow[] }
  | { valid: false; error: string };

const REQUIRED_FIELDS = ["email", "full_name", "matriculation_number"] as const;

/**
 * Type guard to check if a row has valid candidate schema
 */
export function isValidCandidateRow(candidate: Row): candidate is CandidateRow {
  return REQUIRED_FIELDS.every((field) => {
    const value = candidate[field];
    return typeof value === "string" && value.length > 0;
  });
}

/**
 * Validates an array of candidates and returns detailed error information
 */
export function validateCandidates(candidates: Row[]): ValidationResult {
  const invalidCandidates: number[] = [];
  const missingFields = new Set<string>();

  candidates.forEach((candidate, index) => {
    if (!isValidCandidateRow(candidate)) {
      invalidCandidates.push(index + 1); // 1-indexed for user display

      // Track which fields are missing or invalid
      REQUIRED_FIELDS.forEach((field) => {
        const value = candidate[field];
        if (typeof value !== "string" || !value) {
          missingFields.add(field);
        }
      });
    }
  });

  if (invalidCandidates.length > 0) {
    const fieldsList = Array.from(missingFields).join(", ");
    const rowsList =
      invalidCandidates.length <= 5
        ? invalidCandidates.join(", ")
        : `${invalidCandidates.slice(0, 5).join(", ")} and ${invalidCandidates.length - 5} more`;

    return {
      valid: false,
      error: `CSV must contain valid ${fieldsList} columns. Issues found in row(s): ${rowsList}`,
    };
  }

  return {
    valid: true,
    candidates: candidates as CandidateRow[],
  };
}

/**
 * Maps validated candidates to the format expected by the sync API
 */
export function mapCandidatesForSync(candidates: CandidateRow[]) {
  return candidates.map((candidate) => ({
    email: candidate.email,
    full_name: candidate.full_name,
    matriculation_number: candidate.matriculation_number,
  }));
}

/**
 * Maps validated candidates to the format expected by the API
 * @deprecated Use mapCandidatesForSync instead
 */
export function mapCandidatesToPayload(
  candidates: CandidateRow[],
  assessmentId: string,
) {
  return candidates.map((candidate) => ({
    assessment_id: assessmentId,
    email: candidate.email,
    full_name: candidate.full_name,
    matriculation_number: candidate.matriculation_number,
  }));
}

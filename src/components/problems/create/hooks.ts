import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";
import { type Dialect } from "server/problem-database/mappings.ts";

interface SaveProblemMutationProps {
  problemId: string;
  answer: string;
  saveAsTemplate: boolean;
  dialect: Dialect;
}

export const useSaveUserProblemMutation = () => {
  return useMutation({
    mutationFn: async ({
      problemId,
      answer,
      saveAsTemplate,
      dialect,
    }: SaveProblemMutationProps) => {
      // if saveAsTemplate is true, save to both problem and template tables
      // save to user problem table first
      const response = await api.problems["save-user-problem"].$post({
        json: {
          problemId,
          answer,
          saveAsTemplate,
          dialect: dialect,
        },
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`Failed to save user problem: ${errorMsg}`);
      }
    },
  });
};

interface SubmitAssessmentMutationProps {
  assessmentId: string;
  problemId: string;
  key: string;
  sql: string;
  dialect: Dialect;
}

interface SubmitResponse {
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  grade?: "pass" | "failed";
  gradeError?: string;
  error?: string;
}

export const SUBMIT_ASSESSMENT_MUTATION_KEY = [
  "assessment-submit-mutation-key",
] as const;

export const useSubmitAssessmentMutation = () => {
  return useMutation({
    mutationKey: SUBMIT_ASSESSMENT_MUTATION_KEY,
    mutationFn: async ({
      assessmentId,
      problemId,
      key,
      sql,
      dialect,
    }: SubmitAssessmentMutationProps): Promise<SubmitResponse> => {
      const response = await api.student.assessments[":id"].submit.$post({
        param: { id: assessmentId },
        json: {
          key,
          sql,
          dialect,
          problemId,
        },
      });

      const data = await response.json();
      return data;
    },
  });
};

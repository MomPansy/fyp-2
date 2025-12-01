import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";

export interface SubmissionDetail {
  id: string;
  candidateAnswer: string;
  grade: string;
  dialect: string;
  problem: {
    id: string;
    name: string;
    description: string;
  };
}

export interface Submission {
  id: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    matriculationNumber: string | null;
  };
  details: SubmissionDetail[];
}

export interface SubmissionsResponse {
  submissions: Submission[];
}

export function fetchAssessmentSubmissionsQueryOptions(assessmentId: string) {
  return {
    queryKey: ["submissions", "assessment", assessmentId],
    queryFn: async (): Promise<SubmissionsResponse> => {
      const response = await api.submissions.assessment[":assessmentId"].$get({
        param: { assessmentId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }

      return response.json();
    },
  };
}

export function useFetchAssessmentSubmissions(assessmentId: string) {
  return useSuspenseQuery(fetchAssessmentSubmissionsQueryOptions(assessmentId));
}

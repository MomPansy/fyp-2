import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";

export const studentAssessmentKeys = {
  all: ["student-assessments"] as const,
  byId: (id: string) => [...studentAssessmentKeys.all, id] as const,
};

export type AssessmentStatus = "not_started" | "active" | "ended";

export interface AssessmentProblem {
  id: string;
  name: string;
  description: string;
}

export interface ActiveAssessment {
  id: string;
  name: string;
  duration: string;
  dateTimeScheduled: string | null;
  endDate?: string;
  problems: AssessmentProblem[];
}

export interface NotStartedResponse {
  status: "not_started";
  scheduledDate: string;
  assessmentName: string;
}

export interface EndedResponse {
  status: "ended";
  scheduledDate: string;
  endDate: string;
  assessmentName: string;
}

export interface ActiveResponse {
  status: "active";
  assessment: ActiveAssessment;
  serverTime?: string; // ISO timestamp from server for time synchronization
}

export type StudentAssessmentResponse =
  | NotStartedResponse
  | EndedResponse
  | ActiveResponse;

export const fetchStudentAssessmentQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: studentAssessmentKeys.byId(id),
    queryFn: async (): Promise<StudentAssessmentResponse> => {
      const response = await api.student.assessments[":id"].$get({
        param: { id },
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data as StudentAssessmentResponse;
    },
  });
};

export const useFetchStudentAssessment = (id: string) => {
  return useSuspenseQuery(fetchStudentAssessmentQueryOptions(id));
};

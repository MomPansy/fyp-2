import {
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AssessmentListFilters,
  AssessmentListSorting,
  assessmentKeys,
} from "./query-keys.ts";
import { Database } from "@/database.gen.ts";
import { supabase } from "@/lib/supabase.ts";
import { api } from "@/lib/api.ts";

type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
type UserProblem = Database["public"]["Tables"]["user_problems"]["Row"];

export interface AssessmentProblem {
  user_problems: {
    id: UserProblem["id"];
    name: UserProblem["name"];
    description: UserProblem["description"];
    answer: UserProblem["answer"];
  };
}

interface AssessmentPageItem extends Assessment {
  assessment_problems: AssessmentProblem[];
  // Stats from joined queries
  attempted_count?: number;
  invitation_count?: number;
}

export interface AssessmentPage {
  items: AssessmentPageItem[];
  totalCount?: number; // only on first page
  totalPages?: number; // only on first page
}

export interface FetchAssessmentArgs {
  filters: AssessmentListFilters;
  sorting: AssessmentListSorting;
  pageSize: number;
}

function buildQueries(
  filters: AssessmentListFilters,
  sorting: AssessmentListSorting,
) {
  let countQuery = supabase
    .from("assessments")
    .select("id", { count: "exact", head: true });

  let dataQuery = supabase
    .from("assessments")
    .select("*, assessment_problems(user_problems(id, name, description))");

  // filters
  if (filters.name) {
    const term = `%${filters.name.trim()}%`;
    dataQuery = dataQuery.ilike("name", term);
    countQuery = countQuery.ilike("name", term);
  }

  if (filters.users && filters.users.length > 0) {
    // Filter by assessments that have problems assigned to specific users
    dataQuery = dataQuery.in("userId", filters.users);
    countQuery = countQuery.in("userId", filters.users);
  }

  // sorting (stable ordering strongly recommended)
  if (sorting.sortOptions.length > 0) {
    sorting.sortOptions.forEach(({ sortBy, order }) => {
      dataQuery = dataQuery.order(sortBy, { ascending: order === "asc" });
    });
  } else {
    // fallback stable order to prevent paging drift
    dataQuery = dataQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  return { countQuery, dataQuery };
}

/**
 * Fetches stats for assessments: attempted count (distinct submissions) and invitation count
 */
async function fetchAssessmentStats(
  assessmentIds: string[],
): Promise<Map<string, { attempted_count: number; invitation_count: number }>> {
  if (assessmentIds.length === 0) {
    return new Map();
  }

  // Fetch distinct student_assessment_ids that have submissions per assessment
  // This gives us "attempted" count
  const { data: submissionData, error: submissionError } = await supabase
    .from("student_assessments")
    .select("assessment_id, submissions(id)")
    .in("assessment_id", assessmentIds);

  if (submissionError) throw new Error(submissionError.message);

  // Count distinct student_assessments that have at least one submission per assessment
  const attemptedMap = new Map<string, number>();
  for (const sa of submissionData) {
    const submissions = sa.submissions as { id: string }[] | null;
    if (submissions && submissions.length > 0) {
      const currentCount = attemptedMap.get(sa.assessment_id) ?? 0;
      attemptedMap.set(sa.assessment_id, currentCount + 1);
    }
  }

  // Fetch invitation counts per assessment
  const { data: invitationData, error: invitationError } = await supabase
    .from("assessment_student_invitations")
    .select("assessment_id")
    .in("assessment_id", assessmentIds);

  if (invitationError) throw new Error(invitationError.message);

  // Count invitations per assessment
  const invitationMap = new Map<string, number>();
  for (const inv of invitationData) {
    const currentCount = invitationMap.get(inv.assessment_id) ?? 0;
    invitationMap.set(inv.assessment_id, currentCount + 1);
  }

  // Combine into result map
  const result = new Map<
    string,
    { attempted_count: number; invitation_count: number }
  >();
  for (const id of assessmentIds) {
    result.set(id, {
      attempted_count: attemptedMap.get(id) ?? 0,
      invitation_count: invitationMap.get(id) ?? 0,
    });
  }

  return result;
}

export const useFetchAssessmentsInfinite = ({
  filters,
  sorting,
  pageSize,
}: FetchAssessmentArgs) => {
  return useInfiniteQuery({
    queryKey: assessmentKeys.infinite(filters, sorting, pageSize),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const pageIndex = pageParam;

      const { countQuery, dataQuery } = buildQueries(filters, sorting);

      // range is 0-based and inclusive
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      const pagedDataQuery = dataQuery.range(from, to);

      // Only do the COUNT on the first page to avoid extra work
      if (pageIndex === 0) {
        const [{ count, error: countErr }, { data, error }] = await Promise.all(
          [countQuery, pagedDataQuery],
        );
        if (countErr) throw new Error(countErr.message);
        if (error) throw new Error(error.message);

        const totalCount = count ?? 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Fetch stats for the assessments in this page
        const assessmentIds = data.map((a) => a.id);
        const statsMap = await fetchAssessmentStats(assessmentIds);

        // Merge stats into items
        const itemsWithStats: AssessmentPageItem[] = data.map((item) => {
          const stats = statsMap.get(item.id);
          return {
            ...item,
            attempted_count: stats?.attempted_count ?? 0,
            invitation_count: stats?.invitation_count ?? 0,
          } as AssessmentPageItem;
        });

        return {
          items: itemsWithStats,
          totalCount,
          totalPages,
        };
      }

      const { data, error } = await pagedDataQuery;
      if (error) throw new Error(error.message);

      // Fetch stats for the assessments in this page
      const assessmentIds = data.map((a) => a.id);
      const statsMap = await fetchAssessmentStats(assessmentIds);

      // Merge stats into items
      const itemsWithStats: AssessmentPageItem[] = data.map((item) => {
        const stats = statsMap.get(item.id);
        return {
          ...item,
          attempted_count: stats?.attempted_count ?? 0,
          invitation_count: stats?.invitation_count ?? 0,
        } as AssessmentPageItem;
      });

      return { items: itemsWithStats };
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.items.length < pageSize ? undefined : lastPageParam + 1,
  });
};

type UserSelectData = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "email"
>;

export const useFetchUsers = <TData = UserSelectData[]>(
  focused: boolean,
  search?: string,
  select?: (data: UserSelectData[]) => TData,
) => {
  return useQuery({
    enabled: !!focused,
    queryKey: ["users", search],
    queryFn: async (): Promise<UserSelectData[]> => {
      let query = supabase.from("users").select("id, email");
      if (search) {
        const term = `%${search.trim()}%`;
        query = query.ilike("email", term);
      } else {
        query = query.limit(10);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    select,
  });
};

export type CreateAssessmentMutationProps =
  Database["public"]["Tables"]["assessments"]["Insert"];

export const useCreateAssessmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newAssessment: CreateAssessmentMutationProps) => {
      const { data, error } = await supabase
        .from("assessments")
        .insert(newAssessment)
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

export const fetchAssessmentQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: assessmentKeys.byAssesmentId(id),
    queryFn: async (): Promise<AssessmentPageItem | null> => {
      const { data, error } = await supabase
        .from("assessments")
        .select(
          "*, assessment_problems(user_problems(id, name, description, answer))",
        )
        .eq("id", id)
        .single();

      // Handle PGRST116 error (no rows found) gracefully
      if (error && error.code === "PGRST116") return null;

      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useFetchAssessmentById = (id: string) => {
  return useSuspenseQuery(fetchAssessmentQueryOptions(id));
};

interface AddAssessmentProblemMutationProps {
  assessment: string;
  problems: string[];
}

export const useAddAssessmentProblemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessment,
      problems,
    }: AddAssessmentProblemMutationProps) => {
      // Check if assessment is archived first
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("archived_at")
        .eq("id", assessment)
        .single();

      if (assessmentError) throw new Error(assessmentError.message);
      if (assessmentData.archived_at) {
        throw new Error(
          "Cannot modify a cancelled assessment. Please restore it first.",
        );
      }

      // Delete all existing problems for this assessment
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      const { error: deleteError } = await supabase
        .from("assessment_problems")
        .delete()
        .eq("assessment_id", assessment);

      if (deleteError) throw new Error(deleteError.message);

      // Insert the new set of problems (if any)
      if (problems.length > 0) {
        const { data, error } = await supabase
          .from("assessment_problems")
          .insert(
            problems.map((problem) => ({
              assessment_id: assessment,
              problem_id: problem,
            })),
          )
          .select("assessment_id");

        if (error) throw new Error(error.message);
        return data;
      }

      return [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

/**
 * Syncs assessment candidates by removing all existing records and inserting the new ones.
 * This handles both updates and deletions properly.
 */
export const useSyncAssessmentCandidatesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      candidates,
    }: {
      assessmentId: string;
      candidates: {
        email: string;
        matriculation_number: string;
        full_name: string;
      }[];
    }) => {
      // Check if assessment is archived first
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("archived_at")
        .eq("id", assessmentId)
        .single();

      if (assessmentError) throw new Error(assessmentError.message);
      if (assessmentData.archived_at) {
        throw new Error(
          "Cannot modify candidates for a cancelled assessment. Please restore it first.",
        );
      }

      // Delete all existing invitations for this assessment
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      const { error: deleteError } = await supabase
        .from("assessment_student_invitations")
        .delete()
        .eq("assessment_id", assessmentId);

      if (deleteError) throw new Error(deleteError.message);

      // If there are new candidates to insert, insert them
      if (candidates.length > 0) {
        const { error: insertError } = await supabase
          .from("assessment_student_invitations")
          .insert(
            candidates.map((c) => ({
              assessment_id: assessmentId,
              email: c.email,
              matriculation_number: c.matriculation_number,
              full_name: c.full_name,
            })),
          );

        if (insertError) throw new Error(insertError.message);
      }

      return { assessmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.candidatesByAssessmentId(data.assessmentId),
      });
    },
  });
};

/**
 * @deprecated Use useSyncAssessmentCandidatesMutation instead
 */
export const useUpsertAssessmentCandidateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      candidates: {
        assessment_id: string;
        email: string;
        matriculation_number: string;
        full_name: string;
      }[],
    ) => {
      if (candidates.length === 0) {
        throw new Error("No candidates provided");
      }

      const assessmentId = candidates[0].assessment_id;

      // Check if assessment is archived first
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("archived_at")
        .eq("id", assessmentId)
        .single();

      if (assessmentError) throw new Error(assessmentError.message);
      if (assessmentData.archived_at) {
        throw new Error(
          "Cannot modify candidates for a cancelled assessment. Please restore it first.",
        );
      }

      // Check if there are existing invitations before deleting
      const { data: existingInvitations, error: checkError } = await supabase
        .from("assessment_student_invitations")
        .select("id")
        .eq("assessment_id", assessmentId)
        .limit(1);

      if (checkError) throw new Error(checkError.message);

      // Only delete if there are existing invitations
      if (existingInvitations.length > 0) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        const { error: deleteError } = await supabase
          .from("assessment_student_invitations")
          .delete()
          .eq("assessment_id", assessmentId);

        if (deleteError) throw new Error(deleteError.message);
      }

      const { error } = await supabase
        .from("assessment_student_invitations")
        .insert(candidates)
        .select("assessment_id");

      if (error) throw new Error(error.message);

      // Return the assessment_id for cache invalidation
      return { assessment_id: assessmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.candidatesByAssessmentId(data.assessment_id),
      });
    },
  });
};

export const useFetchAssessmentCandidateInvitations = (assessmentId: string) =>
  useSuspenseQuery({
    queryKey: assessmentKeys.candidatesByAssessmentId(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_student_invitations")
        .select("full_name, email, matriculation_number, active")
        .eq("assessment_id", assessmentId);

      if (error) throw new Error(error.message);
      return data;
    },
  });

export const useSendInvitationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      // Send the request to the backend
      const response = await api.invitations.send.$post({
        json: {
          assessmentId,
        },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message);
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (_data, assessmentId) => {
      // Invalidate the candidates query to refetch with updated active status
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.candidatesByAssessmentId(assessmentId),
      });
    },
  });
};

interface UpdateAssessmentSettingsProps {
  id: string;
  dateTimeScheduled: string | null;
  duration: number;
}

export const useUpdateAssessmentSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      dateTimeScheduled,
      duration,
    }: UpdateAssessmentSettingsProps) => {
      // Check if assessment is archived first
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("archived_at")
        .eq("id", id)
        .single();

      if (assessmentError) throw new Error(assessmentError.message);
      if (assessmentData.archived_at) {
        throw new Error(
          "Cannot update settings for a cancelled assessment. Please restore it first.",
        );
      }

      const { data, error } = await supabase
        .from("assessments")
        .update({
          date_time_scheduled: dateTimeScheduled,
          duration: duration,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific assessment query
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.byAssesmentId(variables.id),
      });
      // Also invalidate all assessments list
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

interface UpdateAssessmentNameProps {
  id: string;
  name: string;
}

export const useUpdateAssessmentNameMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: UpdateAssessmentNameProps) => {
      // Check if assessment is archived first
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("archived_at")
        .eq("id", id)
        .single();

      if (assessmentError) throw new Error(assessmentError.message);
      if (assessmentData.archived_at) {
        throw new Error(
          "Cannot update name for a cancelled assessment. Please restore it first.",
        );
      }

      const { data, error } = await supabase
        .from("assessments")
        .update({ name })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific assessment query
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.byAssesmentId(variables.id),
      });
      // Also invalidate all assessments list
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

interface CancelAssessmentProps {
  id: string;
}

export const useCancelAssessmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: CancelAssessmentProps) => {
      const response = await api.assessments.cancel.$post({
        json: { id },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific assessment query
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.byAssesmentId(variables.id),
      });
      // Also invalidate candidates since they're now archived
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.candidatesByAssessmentId(variables.id),
      });
      // Also invalidate all assessments list
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

interface RestoreAssessmentProps {
  id: string;
}

export const useRestoreAssessmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: RestoreAssessmentProps) => {
      const { data, error } = await supabase
        .from("assessments")
        .update({ archived_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific assessment query
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.byAssesmentId(variables.id),
      });
      // Also invalidate all assessments list
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

interface DeleteAssessmentProps {
  ids: string[];
}

export const useDeleteAssessmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: DeleteAssessmentProps) => {
      const response = await api.assessments.$delete({
        json: { ids },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate the specific assessment queries
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({
          queryKey: assessmentKeys.byAssesmentId(id),
        });
      });
      // Also invalidate all assessments list
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

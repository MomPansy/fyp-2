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

type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
type UserProblem = Database["public"]["Tables"]["user_problems"]["Row"];

export interface AssessmentProblem {
  user_problems: {
    id: UserProblem["id"];
    name: UserProblem["name"];
    description: UserProblem["description"];
  };
}

interface AssessmentPageItem extends Assessment {
  assessment_problems: AssessmentProblem[];
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

        return {
          items: data as AssessmentPageItem[],
          totalCount,
          totalPages,
        };
      }

      const { data, error } = await pagedDataQuery;
      if (error) throw new Error(error.message);

      return { items: data as AssessmentPageItem[] };
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
        .select("*, assessment_problems(user_problems(id, name, description))")
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
      const { data, error } = await supabase
        .from("assessment_problems")
        .upsert(
          problems.map((problem) => ({
            assessment_id: assessment,
            problem_id: problem,
          })),
        )
        .select("assessment_id");

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
    },
  });
};

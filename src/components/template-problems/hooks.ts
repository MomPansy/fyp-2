import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import { myProblemKeys } from "../my-problems/query-keys.ts";
import {
  templateProblemKeys,
  ProblemListFilters,
  ProblemListSorting,
} from "./query-keys.ts";
import { Database } from "@/database.gen.ts";
import { supabase } from "@/lib/supabase.ts";
import { api } from "@/lib/api.ts";

export type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];

export interface FetchTemplateProblemsArgs {
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
  pageIndex?: number;
  pageSize: number;
}

export interface TemplateProblemsPage {
  items: ProblemRow[];
  totalCount: number; // raw total rows matching filters
  totalPages: number; // total pages based on pageSize
}

export const fetchTemplateProblemsPage = async ({
  filters,
  sorting,
  pageIndex,
  pageSize,
}: FetchTemplateProblemsArgs): Promise<TemplateProblemsPage> => {
  const start = pageIndex ? pageIndex * pageSize : 0;
  const end = start + pageSize - 1;

  let countQuery = supabase.from("problems").select("id", {
    count: "exact",
    head: true,
  });

  let dataQuery = supabase.from("problems").select("*");

  // apply search filter
  if (filters.search) {
    const term = `%${filters.search}%`;
    dataQuery = dataQuery.or(`name.ilike.${term},description.ilike.${term}`);
    countQuery = countQuery.or(`name.ilike.${term},description.ilike.${term}`);
  }
  if (filters.id) {
    const term = filters.id;
    dataQuery = dataQuery.or(`id.eq.${term}`);
    countQuery = countQuery.or(`id.eq.${term}`);
  }

  // sort
  if (sorting.sortOptions.length > 0) {
    for (const sortOption of sorting.sortOptions) {
      dataQuery = dataQuery.order(sortOption.sortBy, {
        ascending: sortOption.order === "asc",
      });
    }
  }

  // apply range
  dataQuery = dataQuery.range(start || 0, end);
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  const { data: items, error: dataError } = dataResult;
  const { count, error: countError } = countResult;

  if (dataError || countError) {
    throw new Error(
      dataError?.message ?? countError?.message ?? "Unknown error",
    );
  }
  const totalCount = count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  return {
    items: items as ProblemRow[],
    totalCount,
    totalPages,
  };
};

const templateProblemsQueryOptions = ({
  filters,
  sorting,
  pageSize = 20,
  pageIndex = 0,
}: FetchTemplateProblemsArgs): UseSuspenseQueryOptions<TemplateProblemsPage> => {
  return {
    queryKey: templateProblemKeys.listParams(filters, sorting, pageIndex),
    queryFn: () =>
      fetchTemplateProblemsPage({
        filters,
        sorting,
        pageIndex,
        pageSize,
      }),
  };
};

export const useTemplateProblemsQuery = (
  filters: ProblemListFilters,
  sorting: ProblemListSorting,
  pageSize = 20,
  pageIndex = 0,
) => {
  // If search term is invalid (empty or only whitespace), set search to undefined
  // This will be handled by normalizeFilters in the query key
  const normalizedFilters = {
    ...filters,
    search: filters.search?.trim() ? filters.search.trim() : undefined,
  };

  return useSuspenseQuery(
    templateProblemsQueryOptions({
      filters: normalizedFilters,
      sorting,
      pageSize,
      pageIndex,
    }),
  );
};

export const useFetchTemplateProblemDetails = (problemId: string) => {
  return useSuspenseQuery({
    queryKey: [templateProblemKeys.detail(problemId)],
    queryFn: async () => {
      const { data } = await supabase
        .from("problems")
        .select("name, description")
        .eq("id", problemId)
        .single();
      return data;
    },
  });
};

export const useApplyTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateProblemId,
    }: {
      templateProblemId: string;
    }) => {
      const response = await api.problems["use-template"].$post({
        json: {
          templateProblemId,
        },
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || "Failed to apply template");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [myProblemKeys.all] });
    },
  });
};

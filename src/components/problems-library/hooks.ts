import {
  useSuspenseQuery,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import {
  problemLibraryKeys,
  ProblemListFilters,
  ProblemListSorting,
} from "./query-keys.ts";
import { Database } from "@/database.gen.ts";
import { supabase } from "@/lib/supabase.ts";

export type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];

export interface FetchProblemsArgs {
  userId: string;
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
  pageIndex?: number;
  pageSize: number;
}

export interface ProblemsPage {
  items: ProblemRow[];
  totalCount: number; // raw total rows matching filters
  totalPages: number; // total pages based on pageSize
}

export const fetchUserProblemsPage = async ({
  userId,
  filters,
  sorting,
  pageIndex,
  pageSize,
}: FetchProblemsArgs): Promise<ProblemsPage> => {
  const start = pageIndex ? pageIndex * pageSize : 0;
  const end = start + pageSize - 1;

  let countQuery = supabase
    .from("user_problems")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId);

  let dataQuery = supabase
    .from("user_problems")
    .select("*")
    .eq("user_id", userId);

  // apply search filter
  if (filters.search) {
    const term = `%${filters.search}%`;
    dataQuery = dataQuery.or(`name.ilike.${term},description.ilike.${term}`);
    countQuery = countQuery.or(`name.ilike.${term},description.ilike.${term}`);
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

const userProblemsQueryOptions = ({
  userId,
  filters,
  sorting,
  pageSize = 20,
  pageIndex = 0,
}: FetchProblemsArgs): UseSuspenseQueryOptions<ProblemsPage> => {
  return {
    queryKey: problemLibraryKeys.listParams(filters, sorting, pageIndex),
    queryFn: () =>
      fetchUserProblemsPage({
        userId,
        filters,
        sorting,
        pageIndex,
        pageSize,
      }),
  };
};

export const useUserProblemsQuery = (
  userId: string,
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
    userProblemsQueryOptions({
      userId,
      filters: normalizedFilters,
      sorting,
      pageSize,
      pageIndex,
    }),
  );
};

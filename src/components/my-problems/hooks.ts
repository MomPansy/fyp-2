import {
  useInfiniteQuery,
  useSuspenseQuery,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import {
  myProblemKeys,
  ProblemListFilters,
  ProblemListSorting,
} from "./query-keys.ts";
import { Database } from "@/database.gen.ts";
import { supabase } from "@/lib/supabase.ts";

export type UserProblemRow =
  Database["public"]["Tables"]["user_problems"]["Row"] & {
    problems?: {
      id: string;
      name: string;
    };
  };

export interface FetchProblemsArgs {
  userId: string;
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
  pageIndex?: number;
  pageSize: number;
}

export interface FetchProblemsInfiniteArgs {
  userId: string;
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
  pageSize: number;
}

export interface ProblemsPage {
  items: UserProblemRow[];
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
    .select("*, problems(id,name)")
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
    items: items as UserProblemRow[],
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
    queryKey: myProblemKeys.listParams(filters, sorting, pageIndex),
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

export const useUserProblemsInfinite = ({
  userId,
  filters,
  sorting,
  pageSize,
}: FetchProblemsInfiniteArgs) => {
  // Normalize filters similar to the regular query
  const normalizedFilters = {
    ...filters,
    search: filters.search?.trim() ? filters.search.trim() : undefined,
  };

  return useInfiniteQuery({
    queryKey: myProblemKeys.infinite(normalizedFilters, sorting),
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const pageIndex = pageParam;

      // Build queries similar to fetchUserProblemsPage but extracted
      let countQuery = supabase
        .from("user_problems")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userId);

      let dataQuery = supabase
        .from("user_problems")
        .select("*, problems(id,name)")
        .eq("user_id", userId);

      // Apply search filter
      if (normalizedFilters.search) {
        const term = `%${normalizedFilters.search}%`;
        dataQuery = dataQuery.or(
          `name.ilike.${term},description.ilike.${term}`,
        );
        countQuery = countQuery.or(
          `name.ilike.${term},description.ilike.${term}`,
        );
      }

      // Apply sorting
      if (sorting.sortOptions.length > 0) {
        for (const sortOption of sorting.sortOptions) {
          dataQuery = dataQuery.order(sortOption.sortBy, {
            ascending: sortOption.order === "asc",
          });
        }
      } else {
        // fallback stable order to prevent paging drift
        dataQuery = dataQuery
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
      }

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
          items: data as UserProblemRow[],
          totalCount,
          totalPages,
        };
      }

      const { data, error } = await pagedDataQuery;
      if (error) throw new Error(error.message);

      return { items: data as UserProblemRow[] };
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.items.length < pageSize ? undefined : lastPageParam + 1,
  });
};

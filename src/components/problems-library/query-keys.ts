import { Database } from "database.gen";

export type SortOptions = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  "created_at" | "name"
>;

export type FilterOptions = Partial<
  Database["public"]["Tables"]["problems"]["Row"]
>;

export type ProblemSortField = keyof SortOptions;
export type SortDirection = "asc" | "desc";

export interface ProblemListSorting {
  sortOptions: {
    sortBy: ProblemSortField;
    order: SortDirection;
  }[];
}

export interface ProblemListFilters extends Record<string, unknown> {
  search?: string;
}

// function accepts an object {a: 1, b: undefined, c: "", d: null, e: [], f: [1]} and
// turns object into array of key-value pairs [[a, 1], [b, undefined], [c, ""], [d, null], [e, []], [f, [1]]]
// then filters out any pairs where value is undefined, null, empty string, or empty array
// then turns array of key-value pairs back into an object
// result is {a: 1, f: [1]}
// since result is a subset of input, we can type it as Partial<T>

const normalizeFilters = <T extends Record<string, unknown>>(
  f: T,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(f).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  ) as Partial<T>;
};

export const problemLibraryKeys = {
  all: [{ scope: "problems-library" }] as const,

  lists: () => [{ ...problemLibraryKeys.all[0], entity: "list" }] as const,

  listParams: (
    filters: ProblemListFilters,
    sorting: ProblemListSorting,
    pageIndex: number,
  ) =>
    [
      {
        ...problemLibraryKeys.lists()[0],
        kind: "params",
        filters: normalizeFilters(filters),
        sorting: sorting.sortOptions,
        pageIndex,
      },
    ] as const,

  infinite: (filters: ProblemListFilters, sorting: ProblemListSorting) =>
    [
      {
        ...problemLibraryKeys.lists()[0],
        kind: "infinite",
        filters: normalizeFilters(filters),
        sorting: sorting.sortOptions,
      },
    ] as const,

  // Added: total pages key (depends on filters + pageSize)
  totalPages: (filters: ProblemListFilters, pageSize: number) =>
    [
      {
        ...problemLibraryKeys.lists()[0],
        kind: "total-pages",
        filters: normalizeFilters(filters),
        pageSize,
      },
    ] as const,

  // Added: totalCount key (raw row count, independent of page size)
  totalCount: (filters: ProblemListFilters) =>
    [
      {
        ...problemLibraryKeys.lists()[0],
        kind: "total-count",
        filters: normalizeFilters(filters),
      },
    ] as const,

  // Optional: specific page key (usually not needed directly)
  infinitePage: (
    filters: ProblemListFilters,
    sorting: ProblemListSorting,
    pageCursor: string | undefined,
  ) =>
    [
      {
        ...problemLibraryKeys.infinite(filters, sorting)[0],
        page: pageCursor ?? "first",
      },
    ] as const,

  // Detail item key
  detail: (id: string) =>
    [{ ...problemLibraryKeys.all[0], entity: "detail", id }] as const,
};

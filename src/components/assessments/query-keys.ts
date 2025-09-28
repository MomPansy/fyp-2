import { Database } from "@/database.gen.ts";
import { normalizeFilters } from "@/lib/query-utils.ts";

export type AssessmentSortOptions = Pick<
  Database["public"]["Tables"]["assessments"]["Row"],
  "created_at"
>;

export type AssessmentFilterOptions = Pick<
  Database["public"]["Tables"]["assessments"]["Row"],
  "name"
>;

export type AssessmentSortField = keyof AssessmentSortOptions;
export type AssessmentFilterField = keyof AssessmentFilterOptions;
export type SortDirection = "asc" | "desc";

export interface AssessmentListSorting {
  sortOptions: {
    sortBy: AssessmentSortField;
    order: SortDirection;
  }[];
}

export interface AssessmentListFilters extends Record<string, unknown> {
  name?: string;
  users?: string[];
}

export const assessmentKeys = {
  all: [{ scope: "assessments" }] as const,

  lists: () => [{ ...assessmentKeys.all[0], entity: "list" }] as const,

  infinite: (
    filters: AssessmentListFilters,
    sorting: AssessmentListSorting,
    pageSize: number,
  ) =>
    [
      {
        ...assessmentKeys.lists()[0],
        kind: "infinite",
        filters: normalizeFilters(filters),
        sorting: sorting.sortOptions,
        pageSize,
      },
    ] as const,
};

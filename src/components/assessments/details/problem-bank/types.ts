import { PaperProps } from "@mantine/core";
import {
  ProblemListFilters,
  ProblemListSorting,
} from "@/components/my-problems/query-keys.ts";

export interface ProblemBankListProps extends PaperProps {
  filters: ProblemListFilters;
  sorting: ProblemListSorting;
}

export interface ProblemBankFiltersProps extends PaperProps {
  filters: ProblemListFilters;
  setFilters: (filters: ProblemListFilters) => void;
}

export interface ProblemBankModalProps {
  close: () => void;
}

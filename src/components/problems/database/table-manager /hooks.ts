import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ColumnType } from "server/drizzle/_custom";
import { problemTableKeys } from "../../querykeys";

// Original shape: an array of rows, each row: { column_types: ColumnType[] }
interface ColumnConfigValues {
  column_types: ColumnType[];
}

export const useFetchColumnConfig = (problemId: string, tableName: string) => {
  return useSuspenseQuery<ColumnConfigValues>({
    queryKey: ["columnConfig", problemId, tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problem_tables")
        .select("column_types")
        .eq("problem_id", problemId)
        .eq("table_name", tableName)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as unknown as ColumnConfigValues;
    },
  });
};

export const useFetchProblemTables = (problemId: string) => {
  return useSuspenseQuery({
    queryKey: problemTableKeys.byProblemId(problemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problem_tables")
        .select("table_name")
        .eq("problem_id", problemId);

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
};

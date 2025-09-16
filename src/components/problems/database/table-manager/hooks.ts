import { useSuspenseQuery } from "@tanstack/react-query";
import { userProblemTableKeys } from "../../querykeys.ts";
import { supabase } from "@/lib/supabase.ts";
import { ColumnType } from "server/drizzle/_custom.ts";

// Original shape: an array of rows, each row: { column_types: ColumnType[] }
interface ColumnConfigValues {
  column_types: ColumnType[];
}

export const useFetchColumnConfig = (problemId: string, tableId: string) => {
  return useSuspenseQuery<ColumnConfigValues>({
    queryKey: ["columnConfig", problemId, tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_problem_tables")
        .select("column_types")
        .eq("problem_id", problemId)
        .eq("id", tableId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as unknown as ColumnConfigValues;
    },
  });
};

export const useFetchUserProblemTables = (problemId: string) => {
  return useSuspenseQuery({
    queryKey: userProblemTableKeys.basicByProblemId(problemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_problem_tables")
        .select("tableId:id, tableName:table_name")
        .eq("problem_id", problemId);

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
};

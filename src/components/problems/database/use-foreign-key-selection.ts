import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProblemContext } from "../problem-context";
import { ForeignKeyMapping } from "./database-types";
import { supabase } from "@/lib/supabase";
import { problemTableKeys } from "../querykeys";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/notifications";

export const useSaveRelations = () => {
  const { problemId } = useProblemContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      groupedMappings: Record<string, ForeignKeyMapping[]>,
    ) => {
      const updates = [];

      // For each table that has foreign key mappings
      for (const [tableName, mappings] of Object.entries(groupedMappings)) {
        // Transform the mappings to match the server schema
        // Update the relations for this specific table
        const { data, error } = await supabase
          .from("problem_tables")
          .update({ relations: mappings })
          .eq("problem_id", problemId)
          .eq("table_name", tableName);

        if (error) {
          throw new Error(
            `Failed to update relations for table ${tableName}: ${error.message}`,
          );
        }

        updates.push({ tableName, relations: data });
      }

      return updates;
    },
    onMutate: async (groupedMappings) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: problemTableKeys.relationsByProblemId(problemId),
      });

      // Snapshot the previous value
      const previousRelations = queryClient.getQueryData(
        problemTableKeys.relationsByProblemId(problemId),
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        problemTableKeys.relationsByProblemId(problemId),
        (oldData: Record<string, ForeignKeyMapping[]>) => {
          if (!oldData) return groupedMappings;

          // Merge the old data with the new grouped mappings
          return {
            ...oldData,
            ...groupedMappings,
          };
        },
      );

      // Return a context object with the snapshotted value
      return { previousRelations };
    },
    onError: (error, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRelations) {
        queryClient.setQueryData(
          problemTableKeys.relationsByProblemId(problemId),
          context.previousRelations,
        );
      }
      showErrorNotification({
        message: error.message,
        title: "Failed to save relations",
      });
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.relationsByProblemId(problemId),
      });
      showSuccessNotification({
        message: "Relations saved successfully!",
        title: "Success",
      });
    },
  });
};

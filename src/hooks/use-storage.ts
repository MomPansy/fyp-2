import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import { useUser } from "./auth.ts";
import { supabase } from "../lib/supabase.ts";
import { problemTableKeys } from "components/problems/querykeys";
import { ColumnType } from "server/drizzle/_custom";
import { api } from "@/lib/api";
import { Database } from "@/database.gen.ts";

export const useDataStorage = () => {
  const queryClient = useQueryClient();
  const { user_id } = useUser();

  // Call edge function to get signed upload URL and create bucket
  const initializeUpload = async (
    { problemId, tableName }: {
      problemId: string;
      tableName: string;
    },
  ) => {
    try {
      const response = await api.problems["init-upload"].$post({
        "json": {
          problemId,
          tableName,
        },
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`Failed to initialize upload: ${errorMsg}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error initializing upload:", error);
      showErrorNotification({
        title: "Failed to initialize upload",
        message: error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      });

      throw new Error(
        error instanceof Error ? error.message : "Failed to initialize upload",
      );
    }
  };

  const uploadFileToStorage = async ({
    csvString,
    tableName,
    problemId,
    columnTypes,
  }: {
    csvString: string;
    tableName: string;
    problemId: string;
    columnTypes: Omit<ColumnType, "isPrimaryKey">[];
  }) => {
    // Get signed upload URL from edge function
    const { token, path } = await initializeUpload(
      {
        problemId,
        tableName,
      },
    );

    // Convert string to File for proper upload
    const csvFile = new File([csvString], tableName, { type: "text/csv" });

    try {
      const { error: storageError } = await supabase.storage
        .from(user_id)
        .uploadToSignedUrl(path, token, csvFile);

      if (storageError) {
        throw new Error(`Upload failed: ${storageError.message}`);
      }
      // save to db table
      const { error: dbError } = await supabase
        .from("problem_tables")
        .upsert({
          problem_id: problemId,
          ddl_script: "test",
          data_path: path,
          table_name: tableName,
          column_types: columnTypes,
        });

      if (dbError) {
        throw new Error(`Database update failed: ${dbError.message}`);
      }

      // save table metadata
    } catch (error) {
      showErrorNotification({
        title: "File upload failed",
        message: error instanceof Error
          ? error.message
          : "An unexpected error occurred during file upload.",
      });
    }

    return { success: true, filePath: path, token };
  };

  // Mutation for file upload (now uses edge function)
  const uploadMutation = useMutation({
    mutationFn: uploadFileToStorage,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: problemTableKeys.byProblemId(variables.problemId),
      });

      // Snapshot the previous value
      const previousTables = queryClient.getQueryData<
        Database["public"]["Tables"]["problem_tables"]["Row"][]
      >(problemTableKeys.byProblemId(variables.problemId));

      // Optimistically update the cache
      queryClient.setQueryData<
        Database["public"]["Tables"]["problem_tables"]["Row"][]
      >(
        problemTableKeys.byProblemId(variables.problemId),
        (old) => {
          const newTable:
            Database["public"]["Tables"]["problem_tables"]["Row"] = {
              id: `temp-${Date.now()}`, // Temporary ID
              problem_id: variables.problemId,
              table_name: variables.tableName,
              column_types: variables.columnTypes as ColumnType[],
              data_path: "", // Will be updated on success
              ddl_script: "test",
              created_at: new Date().toISOString(),
              // Add optimistic flag as custom property (will be filtered out by TypeScript in real data)
              _optimistic: true,
              relations: [],
            } as Database["public"]["Tables"]["problem_tables"]["Row"] & {
              _optimistic: boolean;
            };

          return old ? [...old, newTable] : [newTable];
        },
      );

      // Return a context with the previous and optimistic values
      return { previousTables, variables };
    },
    onError: (error: Error, variables, context) => {
      // Rollback the optimistic update on error
      if (context?.previousTables !== undefined) {
        queryClient.setQueryData<
          Database["public"]["Tables"]["problem_tables"]["Row"][]
        >(
          problemTableKeys.byProblemId(variables.problemId),
          context.previousTables,
        );
      }
      console.error("File upload error:", error);
    },
    onSuccess: (_data, variables) => {
      // Invalidate all queries related to this problem's tables to get fresh data
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.byProblemId(variables.problemId),
      });
      // Also invalidate column types for this problem
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.columnTypes(variables.problemId),
      });
      // Invalidate relations for this problem
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.relationsByProblemId(variables.problemId),
      });
      // Invalidate the specific table if needed
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.byTableName(variables.tableName),
      });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.byProblemId(variables.problemId),
      });
      // Also ensure column types and relations are refetched
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.columnTypes(variables.problemId),
      });
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.relationsByProblemId(variables.problemId),
      });
    },
  });

  // Combined mutation that handles both bucket creation and upload
  const initUploadMutation = useMutation({
    mutationFn: async (
      { problemId, tableName }: {
        problemId: string;
        tableName: string;
      },
    ) => {
      return await initializeUpload({
        problemId,
        tableName,
      });
    },
    onError: (error: Error) => {
      showErrorNotification({
        title: "Failed to initialize upload",
        message: error.message,
      });
    },
    onSuccess: (_data, variables) => {
      // Optionally, you can handle any success logic here
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.columnTypes(variables.problemId),
      });
    },
  });

  return {
    uploadFile: uploadMutation.mutate,
    isUploadLoading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // New edge function operations
    initializeUpload: initUploadMutation.mutateAsync,
    isInitLoading: initUploadMutation.isPending,
    initError: initUploadMutation.error,

    // Overall loading state
    isLoading: uploadMutation.isPending ||
      initUploadMutation.isPending,
  };
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import { useUser } from "./auth.ts";
import { supabase } from "../lib/supabase.ts";
import { problemTableKeys } from "components/problems/querykeys";
import { ColumnType } from "server/drizzle/_custom";
import { api } from "@/lib/api";

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
    numberOfRows,
    description,
  }: {
    csvString: string;
    tableName: string;
    problemId: string;
    columnTypes: Omit<ColumnType, "isPrimaryKey">[];
    numberOfRows: number;
    description: string;
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
          number_of_rows: numberOfRows,
          description: description,
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
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: problemTableKeys.byProblemId(variables.problemId),
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

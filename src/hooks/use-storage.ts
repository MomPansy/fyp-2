import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database } from "../database.gen.ts";
import { supabase } from "../lib/supabase.ts";
import { showErrorNotification } from "components/notifications.ts";
import { userProblemTableKeys } from "components/problems/querykeys.ts";
import { ColumnType, ForeignKeyMapping } from "server/drizzle/_custom.ts";
import { api } from "@/lib/api.ts";

type Json =
  Database["public"]["Tables"]["problem_tables"]["Row"]["column_types"];

export const useDataStorage = () => {
  const queryClient = useQueryClient();

  // Call edge function to get signed upload URL and create bucket
  const initializeUpload = async ({
    problemId,
    tableName,
  }: {
    problemId: string;
    tableName: string;
  }) => {
    try {
      const response = await api.problems["init-upload"].$post({
        json: {
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
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });

      throw new Error(
        error instanceof Error ? error.message : "Failed to initialize upload",
      );
    }
  };

  const uploadFileToStorage = async ({
    tableId,
    csvString,
    tableName,
    problemId,
    columnTypes,
    numberOfRows,
    description,
    relations,
  }: {
    tableId?: string;
    csvString: string;
    tableName: string;
    problemId: string;
    columnTypes: Omit<ColumnType, "isPrimaryKey">[];
    numberOfRows: number;
    description: string;
    relations: ForeignKeyMapping[];
  }) => {
    // Get signed upload URL from edge function
    const { token, path } = await initializeUpload({
      problemId,
      tableName,
    });
    // Convert string to File for proper upload
    const csvFile = new File([csvString], tableName, { type: "text/csv" });

    const { error: storageError } = await supabase.storage
      .from("tables")
      .uploadToSignedUrl(path, token, csvFile);

    if (storageError) {
      throw new Error(`Upload failed: ${storageError.message}`);
    }

    // save to db table
    const upsertData = {
      ...(tableId && { id: tableId }),
      problem_id: problemId,
      data_path: path,
      table_name: tableName,
      column_types: columnTypes as Json,
      number_of_rows: numberOfRows,
      description: description,
      relations: relations as unknown as Json,
    };

    const { error: dbError, data: upserted } = await supabase
      .from("user_problem_tables")
      .upsert(upsertData, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select();

    if (dbError) {
      console.error("Upsert failed", dbError, { problemId, tableName });
      throw new Error(`Database upsert failed: ${dbError.message}`);
    }
    // save table metadata
    return { success: true, filePath: path, token, upserted };
  };

  const uploadMutation = useMutation({
    mutationFn: uploadFileToStorage,
    onSettled: (_data, _error, variables) => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.basicByProblemId(variables.problemId),
      });
      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.metadataByProblemId(variables.problemId),
      });
      // Also ensure column types and relations are refetched
      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.columnTypes(variables.problemId),
      });
      queryClient.invalidateQueries({
        queryKey: userProblemTableKeys.relationsByProblemId(
          variables.problemId,
        ),
      });
    },
  });

  // Combined mutation that handles both bucket creation and upload
  const initUploadMutation = useMutation({
    mutationFn: async ({
      problemId,
      tableName,
    }: {
      problemId: string;
      tableName: string;
    }) => {
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
        queryKey: userProblemTableKeys.columnTypes(variables.problemId),
      });
    },
  });

  return {
    uploadFile: uploadMutation.mutateAsync,
    isUploadLoading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // New edge function operations
    initializeUpload: initUploadMutation.mutateAsync,
    isInitLoading: initUploadMutation.isPending,
    initError: initUploadMutation.error,

    // Overall loading state
    isLoading: uploadMutation.isPending || initUploadMutation.isPending,
  };
};

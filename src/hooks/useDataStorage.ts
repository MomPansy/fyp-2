import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import { useAccessToken, useUser } from "./auth";
import { supabase } from "../lib/supabase";
import { problemKeys } from "components/problems/querykeys";
import { TableMetadata } from "components/problems/types";
import { ColumnType } from "server/drizzle/_custom";

interface signedUploadResponse {
  signedUrl: string;
  token: string;
  path: string;
}

const testProblemId = "47f122d6-6f6d-47dd-a7d6-168d91d0db2e";

export const useDataStorage = () => {
  const queryClient = useQueryClient();
  const { data: accessTokenData } = useAccessToken();
  const userId = useUser();

  const supabaseUrl = import.meta.env.DEV
    ? "http://127.0.0.1:54321"
    : import.meta.env.VITE_SUPABASE_URL as string;

  // Call edge function to get signed upload URL and create bucket
  const initializeUpload = async (
    tableName: string,
    assessmentName: string,
  ) => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/init-upload`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessTokenData.raw}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          tableName,
          assessmentName,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize upload");
    }

    return await response.json() as signedUploadResponse;
  };

  const uploadFileToStorage = async ({
    csvString,
    tableName,
    assessmentName = "data.csv",
    columnTypes,
  }: {
    csvString: string;
    tableName: string;
    assessmentName?: string;
    columnTypes: ColumnType[];
  }) => {
    // Get signed upload URL from edge function
    const { signedUrl, token, path } = await initializeUpload(
      tableName,
      assessmentName,
    );

    // Convert string to File for proper upload
    const csvFile = new File([csvString], assessmentName, { type: "text/csv" });

    try {
      const { data, error: storageError } = await supabase.storage
        .from(userId)
        .uploadToSignedUrl(path, token, csvFile);

      if (storageError) {
        throw new Error(`Upload failed: ${storageError.message}`);
      }
      // save to db table
      // TODO: insert problem_id instead of testProblemId
      const { error: dbError } = await supabase
        .from("problem_tables")
        .upsert({
          problem_id: testProblemId,
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
    onError: (error: Error) => {
      showErrorNotification({
        title: "Failed to upload file",
        message: error.message,
      });
    },
    onSuccess: () => {
      // TODO: insert problem_id instead of testProblemId
      queryClient.invalidateQueries({
        queryKey: problemKeys.detail(testProblemId),
      });
    },
  });

  // Combined mutation that handles both bucket creation and upload
  const initUploadMutation = useMutation({
    mutationFn: async (
      { tableName, assessmentName }: {
        tableName: string;
        assessmentName: string;
      },
    ) => {
      return await initializeUpload(tableName, assessmentName);
    },
    onError: (error: Error) => {
      showErrorNotification({
        title: "Failed to initialize upload",
        message: error.message,
      });
    },
  });

  return {
    // Bucket operations (legacy compatibility)
    // Upload operations (now uses edge function)
    uploadFile: uploadMutation.mutateAsync,
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
